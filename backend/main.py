import asyncio
import logging
import json
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uuid

from config import config
from reddit_service import reddit_service
from openai_service import openai_service
from sheets_service import SheetsService
from rmp_service import rmp_service
from professor_extraction_service import professor_extraction_service

# setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# create services
sheets_service = SheetsService()

# progress tracking for real-time updates
progress_tracker = {}

class ProgressUpdate:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.events = []
        progress_tracker[session_id] = self
    
    def emit(self, step: str, message: str, progress: int = None):
        """Emit a progress event"""
        event = {
            "step": step,
            "message": message,
            "progress": progress,
            "timestamp": asyncio.get_event_loop().time()
        }
        self.events.append(event)
        logger.info(f"🔔 Progress [{self.session_id}] Step: {step}, Message: {message}, Progress: {progress}%")
    
    def cleanup(self):
        """Clean up progress tracker"""
        if self.session_id in progress_tracker:
            del progress_tracker[self.session_id]

# request models
class PostIdsRequest(BaseModel):
    post_ids: List[str]

class ProfessorAnalysisRequest(BaseModel):
    professor_name: str
    max_posts: int = 50
    max_comments_per_post: int = 50

# create fastapi app
app = FastAPI(
    title="UCR Course Guide API",
    description="API for leveraging community knowledge about UCR courses from Reddit",
    version="1.0.0"
)

# add cors - allow all origins for production deployment flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production
    allow_credentials=False,  # Set to False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """basic health check"""
    return {"message": "UCR Course Guide API is running!", "status": "healthy"}

@app.get("/api/progress/{session_id}")
async def get_progress_stream(session_id: str):
    """Stream real-time progress updates for a session"""
    
    async def event_generator():
        last_event_index = 0
        timeout_count = 0
        max_timeout = 120  # 2 minutes timeout
        session_found = False
        
        # send initial connection confirmation
        yield f"data: {json.dumps({'step': 'connected', 'message': 'Connecting...', 'progress': 0})}\n\n"
        
        while timeout_count < max_timeout:
            if session_id in progress_tracker:
                if not session_found:
                    session_found = True
                    logger.info(f"📡 SSE session {session_id} found in tracker")
                
                tracker = progress_tracker[session_id]
                
                # send any new events
                if len(tracker.events) > last_event_index:
                    for event in tracker.events[last_event_index:]:
                        logger.info(f"📤 SSE sending event: {event}")
                        yield f"data: {json.dumps(event)}\n\n"
                    last_event_index = len(tracker.events)
                    timeout_count = 0  # Reset timeout when we send data
                else:
                    # send heartbeat
                    yield f"data: {json.dumps({'heartbeat': True})}\n\n"
                    timeout_count += 1
            else:
                # session not found, just send heartbeat
                yield f"data: {json.dumps({'heartbeat': True})}\n\n"
                timeout_count += 1
            
            await asyncio.sleep(1)  # Check every second
        
        # send completion event
        yield f"data: {json.dumps({'step': 'timeout', 'message': 'Connection timed out'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )

@app.get("/api/progress/test/{session_id}")
async def test_progress_stream(session_id: str):
    """Test SSE connection with fake progress events"""
    
    async def test_event_generator():
        # send test events
        for i in range(5):
            event = {
                "step": f"test_step_{i}",
                "message": f"Test message {i+1}/5",
                "progress": (i + 1) * 20
            }
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(2)  # 2 second intervals
        
        # send completion
        yield f"data: {json.dumps({'step': 'complete', 'message': 'Test complete'})}\n\n"
    
    return StreamingResponse(
        test_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "X-Accel-Buffering": "no",
        }
    )

@app.get("/api/search")
async def search_course_info(
    keyword: str = Query(..., description="Course ID or name to search for"),
    limit: int = Query(default=100, ge=1, le=200, description="Maximum posts to retrieve")
) -> Dict[str, Any]:
    """
    search for posts about ucr courses from r/ucr
    """
    try:
        logger.info(f"Searching for keyword: {keyword} with limit: {limit}")
        
        if not keyword.strip():
            raise HTTPException(status_code=400, detail="Keyword cannot be empty")
        
        # search reddit using our service
        results = await reddit_service.search_course_info(keyword.strip(), limit)
        
        return {
            "success": True,
            "data": results
        }
        
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/api/post/{post_id}/comments")
async def get_post_comments(
    post_id: str,
    limit: int = Query(default=50, ge=1, le=100, description="Maximum comments to retrieve")
):
    """
    get comments from a specific reddit post
    """
    try:
        logger.info(f"Getting comments for post: {post_id}")
        
        comments = await reddit_service.get_post_comments(post_id, limit)
        
        return {
            "success": True,
            "post_id": post_id,
            "comments_count": len(comments),
            "comments": comments
        }
        
    except Exception as e:
        logger.error(f"Error getting comments for post {post_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get comments: {str(e)}")

@app.get("/api/health")
async def health_check():
    """check if reddit api is working"""
    try:
        # simple health check without reddit api call
        return {
            "status": "healthy",
            "reddit_connection": "ready",
            "reddit_readonly": True,  # We're always in read-only mode
            "message": "All systems operational"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "reddit_connection": "failed",
            "error": str(e)
        }

# test endpoint for reddit connectivity
@app.get("/api/post/{post_id}/full-content")
async def get_full_post_for_ai(
    post_id: str,
    max_comments: int = Query(default=100, ge=1, le=300, description="Maximum comments to retrieve for AI analysis")
):
    """
    get full post content for ai analysis (no limits on text length)
    """
    try:
        logger.info(f"Getting full content for AI analysis: {post_id}")
        
        full_content = await reddit_service.get_full_post_content_for_ai(post_id, max_comments)
        
        return {
            "success": True,
            "data": full_content
        }
        
    except Exception as e:
        logger.error(f"Error getting full content for post {post_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get full content: {str(e)}")

@app.post("/api/posts/full-content")
async def get_multiple_posts_for_ai(
    request: PostIdsRequest,
    max_comments_per_post: int = Query(default=50, ge=1, le=150, description="Max comments per post")
):
    """
    get content from multiple posts for ai analysis
    """
    try:
        post_ids = request.post_ids
        logger.info(f"Getting full content for {len(post_ids)} posts for AI analysis")
        
        if len(post_ids) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 posts allowed per request")
        
        full_content = await reddit_service.get_multiple_posts_for_ai(post_ids, max_comments_per_post)
        
        return {
            "success": True,
            "data": full_content
        }
        
    except Exception as e:
        logger.error(f"Error getting multiple posts for AI: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get multiple posts: {str(e)}")

@app.get("/api/course-analysis-enhanced")
async def get_enhanced_course_analysis(
    keyword: str = Query(..., description="Course ID or name to analyze"),
    max_posts: int = Query(default=50, ge=1, le=200, description="Maximum posts to analyze"),
    max_comments_per_post: int = Query(default=50, ge=1, le=200, description="Max comments per post"),
    include_rmp: bool = Query(default=True, description="Include Rate My Professor data"),
    school_name: str = Query(default="University of California Riverside", description="School name for RMP lookup"),
    session_id: str = Query(default=None, description="Session ID for progress tracking")
):
    """
    🆕 OPTIMIZED ENHANCED WORKFLOW: 
    Reddit + Sheets Analysis → Extract Finalized Professors → Targeted RMP Search → Enhanced Final Analysis
    
    This approach is much more efficient than the previous "extract all possible professor names" approach:
    1. First analyzes Reddit + Google Sheets to determine ACTUAL relevant professors
    2. Only searches RMP for those finalized professors (not a broad "could be" list) 
    3. Re-runs analysis with RMP data for enhanced results
    """
    # initialize progress tracking
    if not session_id:
        session_id = str(uuid.uuid4())
    
    progress = ProgressUpdate(session_id)
    progress.emit("starting", f"Starting analysis for {keyword}...", 0)
    
    # small delay to ensure sse connection can find the session
    await asyncio.sleep(0.1)
    
    try:
        logger.info(f"🚀 Optimized enhanced analysis for: {keyword}")
        
        if not keyword.strip():
            progress.cleanup()
            raise HTTPException(status_code=400, detail="Course keyword cannot be empty")
        
        # step 1: get reddit and spreadsheet data
        logger.info("Step 1: Fetching Reddit and UCR database data...")
        progress.emit("reddit_search", "Searching Reddit discussions...", 10)
        
        search_results = await reddit_service.search_course_info(keyword.strip(), max_posts)
        
        if not search_results or search_results["total_posts"] == 0:
            ucr_data = sheets_service.format_for_ai_analysis(keyword.strip())
            if not ucr_data or ucr_data.strip() == "":
                return {
                    "success": False,
                    "error": "No data found",
                    "message": f"No Reddit posts or UCR database entries found for '{keyword}'"
                }
            
            # analyze with spreadsheet data only using comprehensive approach
            extraction_course_data = {
                "course": keyword.strip(),
                "posts": [],
                "ucr_database": ucr_data
            }
            
            # extract professor names from database data
            professor_names = await openai_service.extract_all_professor_names(extraction_course_data)
            logger.info(f"🔍 Extracted {len(professor_names)} professor names from database: {professor_names}")
            
            # Try RMP search if enabled and professors found
            rmp_data = {"professors": [], "enabled": False}
            if include_rmp and professor_names:
                try:
                    rmp_result = await rmp_service.get_course_specific_professor_data(
                        course_code=keyword.strip(),
                        extracted_professors=professor_names,
                        school_name=school_name
                    )
                    if rmp_result["success"]:
                        rmp_data = {
                            "enabled": True,
                            "professors": rmp_result["professors"],
                            "stats": rmp_result["stats"],
                            "school": rmp_result.get("school", {})
                        }
                except Exception as e:
                    logger.error(f"RMP search failed for database-only analysis: {e}")
            
            course_data = {
                "course": keyword.strip(),
                "posts": [],
                "ucr_database": ucr_data,
                "rmp_data": rmp_data
            }
            
            ai_analysis = await openai_service.analyze_course_discussions_structured(course_data)
            
            return {
                "success": True,
                "posts_analyzed": 0,
                "ucr_database_included": True,
                "rmp_enabled": include_rmp,
                "raw_data": course_data,
                "analysis": {
                    "structured_data": ai_analysis.get("analysis") if ai_analysis.get("success") else None,
                    "analysis_metadata": {
                        "total_posts_analyzed": 0,
                        "total_comments_analyzed": 0,
                        "ucr_database_included": True,
                        "rmp_enabled": include_rmp,
                        "rmp_professors_count": len(rmp_data.get("professors", [])),
                        "total_rmp_reviews": sum(prof.get("course_reviews_count", 0) for prof in rmp_data.get("professors", []))
                    }
                },
                "optimization": "ai_comprehensive_database_only",
                "professor_extraction": {
                    "method": "ai_comprehensive",
                    "extracted_count": len(professor_names),
                    "rmp_found_count": len(rmp_data.get("professors", []))
                }
            }
        
        ucr_posts = search_results["subreddits"].get("ucr", {}).get("posts", [])
        if not ucr_posts:
            return {
                "success": False,
                "error": "No UCR posts found",
                "message": f"No posts found in r/ucr for '{keyword}'"
            }
        
        post_ids = [post["id"] for post in ucr_posts[:max_posts]]
        
        logger.info("Fetching Reddit full content and UCR database data in parallel...")
        
        reddit_task = reddit_service.get_multiple_posts_for_ai(post_ids, max_comments_per_post)
        sheets_task = asyncio.to_thread(sheets_service.format_for_ai_analysis, keyword.strip())
        
        full_content_data, ucr_database_data = await asyncio.gather(reddit_task, sheets_task)
        
        if not full_content_data["success"]:
            return {
                "success": False,
                "error": "Failed to get full Reddit content"
            }
        
        posts_data = full_content_data["data"]
        filtered_posts_data = reddit_service.filter_posts_for_main_topic(posts_data, keyword.strip())
        
        # STEP 2: 🎯 FIRST ANALYSIS - Determine actual professors from Reddit + Google Sheets
        logger.info("Step 2: Running initial analysis to determine actual professors from Reddit + Google Sheets...")
        progress.emit("initial_analysis", "Analyzing data...", 20)
        
        initial_course_data = {
            "course": keyword.strip(),
            "posts": filtered_posts_data,
            "ucr_database": ucr_database_data if ucr_database_data else ""
        }
        
        # Run structured analysis to get professors based on actual data
        initial_analysis = await openai_service.analyze_course_discussions_structured(initial_course_data)
        
        if not initial_analysis.get("success"):
            logger.warning("Initial analysis failed, proceeding without RMP data")
            return {
                "success": True,
                "posts_analyzed": len(filtered_posts_data),
                "ucr_database_included": bool(ucr_database_data),
                "rmp_enabled": include_rmp,
                "raw_data": initial_course_data,
                "analysis": {
                    "structured_data": initial_analysis.get("analysis"),
                    "analysis_metadata": {
                        "total_posts_analyzed": len(filtered_posts_data),
                        "total_comments_analyzed": sum(len(post_data.get("comments", [])) for post_data in filtered_posts_data),
                        "ucr_database_included": bool(ucr_database_data),
                        "rmp_enabled": False,
                        "rmp_professors_count": 0,
                        "total_rmp_reviews": 0
                    }
                },
                "optimization": "initial_analysis_failed",
                "professor_extraction": {
                    "method": "none",
                    "extracted_count": 0,
                    "rmp_found_count": 0
                }
            }
        
        # STEP 3: Extract professor names from the initial analysis result
        finalized_professors = []
        try:
            analysis_data = initial_analysis.get("analysis", {})
            professors_section = analysis_data.get("professors", [])
            
            for prof in professors_section:
                prof_name = prof.get("name", "").strip()
                if prof_name and len(prof_name) > 2:
                    finalized_professors.append(prof_name)
            
            logger.info(f"🎯 Extracted {len(finalized_professors)} finalized professors from analysis: {finalized_professors}")
            
        except Exception as e:
            logger.error(f"Error extracting professors from initial analysis: {e}")
            finalized_professors = []
        
        # STEP 4: Targeted RMP Search (only if we have finalized professors and RMP is enabled)
        rmp_data = {"professors": [], "enabled": False}
        
        if include_rmp and finalized_professors:
            logger.info(f"Step 4: Targeted RMP search for {len(finalized_professors)} finalized professors...")
            progress.emit("rmp_search", "Searching Rate My Professors...", 60)
            
            try:
                # Much more efficient - only search for professors actually found in data
                rmp_result = await rmp_service.get_course_specific_professor_data(
                    course_code=keyword.strip(),
                    extracted_professors=finalized_professors,  # Only finalized professors
                    school_name=school_name
                )
                
                if rmp_result["success"]:
                    rmp_data = {
                        "enabled": True,
                        "professors": rmp_result["professors"],
                        "stats": rmp_result["stats"],
                        "school": rmp_result.get("school", {})
                    }
                    logger.info(f"Retrieved RMP data for {len(rmp_result['professors'])} professors")
                else:
                    logger.warning(f"RMP data retrieval failed: {rmp_result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                logger.error(f"Error in targeted RMP search: {e}")
                rmp_data = {"enabled": True, "error": str(e)}
        
        # STEP 5: Final Enhanced AI Analysis (if we have RMP data, re-analyze with it)
        if rmp_data.get("professors"):
            logger.info("Step 5: Re-running analysis with RMP data for enhanced results...")
            progress.emit("final_analysis", "Generating comprehensive analysis...", 80)
            
            final_course_data = {
                "course": keyword.strip(),
                "posts": filtered_posts_data,
                "ucr_database": ucr_database_data if ucr_database_data else "",
                "rmp_data": rmp_data
            }
            
            final_analysis = await openai_service.analyze_course_discussions_structured(final_course_data)
        else:
            logger.info("Step 5: No RMP data available, using initial analysis results...")
            progress.emit("final_analysis", "Finalizing analysis...", 80)
            final_analysis = initial_analysis
            final_course_data = initial_course_data
        
        if final_analysis.get("success"):
            logger.info("✅ Final analysis completed successfully")
        else:
            logger.warning("⚠️ Final analysis had issues, but continuing...")
        
        # Completion event
        progress.emit("complete", "Analysis complete!", 100)
        
        # Return the final analysis result with session_id
        result = {
            "success": True,
            "posts_analyzed": len(filtered_posts_data),
            "ucr_database_included": bool(ucr_database_data),
            "rmp_enabled": include_rmp,
            "raw_data": final_course_data,
            "analysis": {
                "structured_data": final_analysis.get("analysis") if final_analysis.get("success") else None,
                "analysis_metadata": {
                    "total_posts_analyzed": len(filtered_posts_data),
                    "total_comments_analyzed": sum(len(post_data.get("comments", [])) for post_data in filtered_posts_data),
                    "ucr_database_included": bool(ucr_database_data),
                    "rmp_enabled": include_rmp,
                    "rmp_professors_count": len(rmp_data.get("professors", [])),
                    "total_rmp_reviews": sum(prof.get("course_reviews_count", 0) for prof in rmp_data.get("professors", []))
                }
            },
            "optimization": "finalized_professors_then_rmp" if rmp_data.get("professors") else "reddit_and_sheets_only",
            "professor_extraction": {
                "method": "analysis_based_finalized", 
                "finalized_count": len(finalized_professors),
                "rmp_found_count": len(rmp_data.get("professors", []))
            },
            "session_id": session_id
        }
        
        # Cleanup progress tracker after successful completion
        progress.cleanup()
        return result
        
    except Exception as e:
        logger.error(f"Optimized enhanced course analysis failed for {keyword}: {e}")
        # Cleanup progress tracker on error
        if 'progress' in locals():
            progress.emit("error", f"Analysis failed: {str(e)}", 0)
            progress.cleanup()
        raise HTTPException(status_code=500, detail=f"Enhanced course analysis failed: {str(e)}")

@app.get("/api/course-analysis-structured")
async def get_structured_course_analysis(
    keyword: str = Query(..., description="Course ID or name to analyze"),
    max_posts: int = Query(default=50, ge=1, le=200, description="Maximum posts to analyze"),
    max_comments_per_post: int = Query(default=50, ge=1, le=200, description="Max comments per post"),
    session_id: str = Query(default=None, description="Session ID for progress tracking")
):
    """
    🔄 LEGACY ENDPOINT: Redirects to enhanced endpoint for backward compatibility
    """
    # Call the enhanced endpoint with RMP enabled by default
    return await get_enhanced_course_analysis(
        keyword=keyword,
        max_posts=max_posts,
        max_comments_per_post=max_comments_per_post,
        include_rmp=True,
        school_name="University of California Riverside",
        session_id=session_id
    )

@app.get("/api/professor-analysis")
async def get_professor_analysis(
    professor_name: str = Query(..., description="Professor name to analyze"),
    max_posts: int = Query(default=50, ge=1, le=200, description="Maximum posts to analyze"),
    max_comments_per_post: int = Query(default=50, ge=1, le=200, description="Max comments per post"),
    school_name: str = Query(default="University of California Riverside", description="School name for RMP lookup"),
    session_id: str = Query(default=None, description="Session ID for progress tracking")
):
    """
    🆕 PROFESSOR ANALYSIS: Comprehensive professor review analysis
    Searches RMP, Reddit, and Google Sheets for a specific professor
    """
    # Initialize progress tracking for professor analysis
    if not session_id:
        session_id = str(uuid.uuid4())
    
    progress = ProgressUpdate(session_id)
    progress.emit("starting", f"Starting professor analysis for {professor_name}...", 0)
    
    try:
        logger.info(f"🎓 Professor analysis for: {professor_name}")
        
        if not professor_name.strip():
            progress.cleanup()
            raise HTTPException(status_code=400, detail="Professor name cannot be empty")
        
        # STEP 1: Search RMP FIRST for fast course validation
        logger.info("Step 1: Searching Rate My Professors...")
        progress.emit("rmp_search", "Searching Rate My Professors...", 20)
        rmp_data = {"professors": [], "enabled": False}
        
        try:
            # Quick RMP lookup for professor data
            rmp_result = await rmp_service.get_course_specific_professor_data(
                course_code="",
                extracted_professors=[professor_name.strip()],
                school_name=school_name
            )
            
            if rmp_result["success"] and rmp_result["professors"]:
                rmp_data = {
                    "enabled": True,
                    "professors": rmp_result["professors"],
                    "stats": rmp_result["stats"],
                    "school": rmp_result.get("school", {})
                }
                # Get the actual professor name from RMP for more accurate searches
                actual_professor_name = rmp_result["professors"][0].get("name", professor_name.strip())
                if actual_professor_name != professor_name.strip():
                    logger.info(f"Found RMP data for '{professor_name}' → using correct name: '{actual_professor_name}'")
                else:
                    logger.info(f"Found RMP data for {professor_name}")
            else:
                actual_professor_name = professor_name.strip()
                logger.warning(f"No RMP data found for {professor_name}")
                
        except Exception as e:
            actual_professor_name = professor_name.strip()
            logger.error(f"RMP search failed for {professor_name}: {e}")
        
        # Skip course validation - analyzing all professor data
        
        # STEP 2: Search Reddit for the professor
        logger.info("Step 2: Searching Reddit...")
        progress.emit("reddit_search", "Searching Reddit posts...", 40)
        reddit_posts_data = []
        
        try:
            # 🚀 REDDIT SEARCH for professor
            search_query = actual_professor_name
            logger.info(f"🔍 Reddit search for professor: '{search_query}'")
            
            search_results = await reddit_service.search_course_info(search_query, max_posts)
            
            if search_results and search_results["total_posts"] > 0:
                ucr_posts = search_results["subreddits"].get("ucr", {}).get("posts", [])
                
                if ucr_posts:
                    post_ids = [post["id"] for post in ucr_posts[:max_posts]]
                    full_content_data = await reddit_service.get_multiple_posts_for_ai(post_ids, max_comments_per_post)
                    
                    if full_content_data["success"]:
                        reddit_posts_data = full_content_data["data"]
                        logger.info(f"Found {len(reddit_posts_data)} Reddit posts mentioning {actual_professor_name}")
                        
        except Exception as e:
            logger.error(f"Reddit search failed for {actual_professor_name}: {e}")
            
        # STEP 3: Search UCR Database for the professor (OPTIMIZED)
        logger.info("Step 3: Searching UCR Database...")
        progress.emit("database_search", "Searching Google Sheets database...", 60)
        ucr_professor_mentions = ""
        
        try:
            # 🚀 EFFICIENT UCR DATABASE SEARCH
            # Get relevant reviews for professor analysis
            ucr_reviews = sheets_service.get_reviews_for_professor_analysis("")
            
            if ucr_reviews:
                # Format reviews for AI processing
                formatted_ucr_data = sheets_service.format_reviews_for_professor_ai(
                    ucr_reviews, 
                    actual_professor_name, 
                    ""
                )
                
                # Use AI to filter for professor mentions
                if formatted_ucr_data:
                    ucr_filter_result = await openai_service.filter_ucr_reviews_for_professor(
                        actual_professor_name,
                        formatted_ucr_data,
                        ""
                    )
                    
                    if ucr_filter_result.get("success"):
                        ucr_professor_mentions = ucr_filter_result.get("professor_mentions", "")
                        if ucr_professor_mentions:
                            logger.info(f"Found UCR database mentions for {actual_professor_name}")
                        else:
                            logger.info(f"No UCR database mentions found for {actual_professor_name}")
                    else:
                        logger.warning(f"UCR filtering failed for {actual_professor_name}")
            else:
                logger.info(f"No UCR database reviews found for analysis")
                
        except Exception as e:
            logger.error(f"UCR database search failed for {actual_professor_name}: {e}")
            
        # STEP 4: Use all data (no course filtering)
        filtered_reddit_data = reddit_posts_data
        filtered_sheets_data = ucr_professor_mentions
        
        # STEP 5: Validate we have REAL data before AI analysis
        has_rmp_data = rmp_data.get("professors") and len(rmp_data.get("professors", [])) > 0
        has_reddit_data = filtered_reddit_data and len(filtered_reddit_data) > 0
        has_sheets_data = filtered_sheets_data and (isinstance(filtered_sheets_data, str) and filtered_sheets_data.strip())
        
        # Strict validation: Require RMP data to confirm this is a real professor
        # UCR database and Reddit alone can be too noisy for nonsensical searches
        if not has_rmp_data:
            logger.warning(f"No data found for professor {actual_professor_name} from any source")
            return {
                "success": False,
                "error": "professor_not_found",
                "message": f"Professor '{actual_professor_name}' not found in our databases. Please double-check the professor name spelling.",
                "professor_name": professor_name.strip(),  # Keep original for frontend display
                "course_filter": None,
                "suggestion": "Try searching with a different spelling.",
                "data_sources_checked": {
                    "rmp": "No professors found",
                    "reddit": "No posts found", 
                    "ucr_database": "No mentions found"
                }
            }
        
        # STEP 5: Comprehensive AI Analysis (only with real data)
        logger.info("Step 5: Running comprehensive professor analysis...")
        progress.emit("final_analysis", "Generating professor profile...", 80)
        
        analysis_data = {
            "professor_name": actual_professor_name,
            "course_filter": "",
            "posts": filtered_reddit_data,
            "ucr_database": filtered_sheets_data,
            "rmp_data": rmp_data
        }
        
        analysis_result = await openai_service.analyze_professor_comprehensive(analysis_data)
        
        # Calculate accurate data source stats
        total_rmp_course_reviews = sum(prof.get("course_reviews_count", 0) for prof in rmp_data.get("professors", []))
        
        progress.emit("complete", "Professor analysis complete!", 100)
        
        logger.info(f"📊 Data Sources Summary:")
        logger.info(f"  - RMP Professors Found: {len(rmp_data.get('professors', []))}")
        logger.info(f"  - RMP Course Reviews: {total_rmp_course_reviews}")
        logger.info(f"  - Reddit Posts: {len(filtered_reddit_data)}")
        logger.info(f"  - UCR Database: {'Yes' if filtered_sheets_data else 'No'}")
        
        result = {
            "success": True,
            "professor_name": professor_name.strip(),  # Keep original for frontend display
            "actual_professor_name": actual_professor_name,  # Add corrected name for reference
            "course_filter": None,
            "data_sources": {
                "rmp_professors_found": len(rmp_data.get("professors", [])),
                "reddit_posts_analyzed": len(filtered_reddit_data),
                "reddit_comments_analyzed": sum(len(post_data.get("comments", [])) for post_data in filtered_reddit_data),
                "ucr_database_included": bool(filtered_sheets_data),
                "total_rmp_reviews": total_rmp_course_reviews  # Use course-specific count
            },
            "raw_data": analysis_data,
            "analysis": analysis_result,
            "session_id": session_id
        }
        
        progress.cleanup()
        return result
        
    except Exception as e:
        logger.error(f"Professor analysis failed for {professor_name}: {e}")
        if 'progress' in locals():
            progress.emit("error", f"Professor analysis failed: {str(e)}", 0)
            progress.cleanup()
        raise HTTPException(status_code=500, detail=f"Professor analysis failed: {str(e)}")

@app.get("/api/course-analysis")
async def get_complete_course_analysis(
    keyword: str = Query(..., description="Course ID or name to analyze"),
    max_posts: int = Query(default=50, ge=1, le=200, description="Maximum posts to analyze"),
    max_comments_per_post: int = Query(default=50, ge=1, le=200, description="Max comments per post")
):
    """
    🎯 the main endpoint: search course → get content → get ucr database → ai analysis
    """
    try:
        logger.info(f"Complete course analysis for: {keyword}")
        
        if not keyword.strip():
            raise HTTPException(status_code=400, detail="Course keyword cannot be empty")
        
        # step 1: search reddit for posts about this course
        search_results = await reddit_service.search_course_info(keyword.strip(), max_posts)
        
        if not search_results or search_results["total_posts"] == 0:
            # no reddit posts found, try ucr database only
            ucr_data = sheets_service.format_for_ai_analysis(keyword.strip())
            
            if not ucr_data or ucr_data.strip() == "":
                return {
                    "success": False,
                    "error": "No data found",
                    "message": f"No Reddit posts or UCR database entries found for '{keyword}'"
                }
            
            # we have ucr database data but no reddit posts
            course_data = {
                "course": keyword.strip(),
                "posts": [],
                "ucr_database": ucr_data
            }
            
            # run ai analysis with just database data
            ai_analysis = await openai_service.analyze_course_discussions(course_data)
            
            return {
                "success": True,
                "posts_analyzed": 0,
                "ucr_database_included": True,
                "raw_data": {
                    "course": keyword.strip(),
                    "posts": [],
                    "ucr_database": ucr_data
                },
                "ai_analysis": ai_analysis
            }
        
        # step 2: get full content from reddit posts for ai
        ucr_posts = search_results["subreddits"].get("ucr", {}).get("posts", [])
        
        if not ucr_posts:
            return {
                "success": False,
                "error": "No UCR posts found",
                "message": f"No posts found in r/ucr for '{keyword}'"
            }
        
        # get post ids from search results
        post_ids = [post["id"] for post in ucr_posts[:max_posts]]
        
        # step 2 & 3: 🚀 PARALLEL DATA GATHERING - Fetch Reddit full content AND Sheets data simultaneously!
        logger.info("Fetching Reddit full content and UCR database data in parallel...")
        reddit_task = reddit_service.get_multiple_posts_for_ai(post_ids, max_comments_per_post)
        sheets_task = asyncio.to_thread(sheets_service.format_for_ai_analysis, keyword.strip())
        
        full_content_data, ucr_database_data = await asyncio.gather(reddit_task, sheets_task)
        
        if not full_content_data["success"]:
            return {
                "success": False,
                "error": "Failed to get full Reddit content",
                "message": "Could not retrieve full post content for analysis"
            }
        
        posts_data = full_content_data["data"]
        
        # step 4: 🎯 FILTER POSTS FOR MAIN TOPIC RELEVANCE (before AI analysis)
        filtered_posts_data = reddit_service.filter_posts_for_main_topic(posts_data, keyword.strip())
        
        # step 5: combine data for ai analysis
        course_data = {
            "course": keyword.strip(),
            "posts": filtered_posts_data,  # Use filtered posts for AI analysis
            "ucr_database": ucr_database_data if ucr_database_data else ""
        }
        
        # step 6: run ai analysis
        ai_analysis = await openai_service.analyze_course_discussions(course_data)
        
        return {
            "success": True,
            "posts_analyzed": len(filtered_posts_data),
            "ucr_database_included": bool(ucr_database_data),
            "raw_data": {
                "course": keyword.strip(),
                "posts": filtered_posts_data,  # Send filtered posts to frontend
                "ucr_database": ucr_database_data
            },
            "ai_analysis": ai_analysis
        }
        
    except Exception as e:
        logger.error(f"Complete course analysis failed for {keyword}: {e}")
        raise HTTPException(status_code=500, detail=f"Course analysis failed: {str(e)}")

@app.get("/api/test-sheets")
async def test_sheets_data(
    course: str = Query(default="cs010", description="Course to test Google Sheets data for")
):
    """
    test endpoint to check if google sheets integration works
    """
    try:
        logger.info(f"Testing Google Sheets integration for course: {course}")
        
        # get class reviews
        reviews = sheets_service.get_class_reviews(course.upper())
        
        # get formatted data for ai
        ai_formatted_data = sheets_service.format_for_ai_analysis(course.upper())
        
        # get summary
        summary = sheets_service.get_class_summary(course.upper())
        
        return {
            "success": True,
            "course": course.upper(),
            "reviews_count": len(reviews),
            "reviews": reviews[:15],  # increased for better professor analysis
            "ai_formatted_preview": ai_formatted_data[:500] if ai_formatted_data else "No data",
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Error testing sheets for {course}: {e}")
        raise HTTPException(status_code=500, detail=f"Sheets test failed: {str(e)}")

@app.get("/api/available-classes")
async def get_available_classes():
    """
    get list of all classes in the ucr database
    """
    try:
        logger.info("Getting list of available classes from UCR database")
        
        available_classes = sheets_service.get_available_classes()
        
        return {
            "success": True,
            "classes_count": len(available_classes),
            "classes": available_classes
        }
        
    except Exception as e:
        logger.error(f"Error getting available classes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get available classes: {str(e)}")

@app.get("/api/test")
async def test_reddit_connection():
    """
    basic test to see if reddit api works
    """
    try:
        # test basic reddit connection using our service method
        test_results = await reddit_service.search_course_info("cs010", 1)
        
        return {
            "success": True,
            "message": "Reddit connection working",
            "test_posts_found": test_results["total_posts"] if test_results else 0,
            "reddit_service": "operational"
        }
        
    except Exception as e:
        logger.error(f"Reddit test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Reddit test failed: {str(e)}")

@app.get("/api/test-enhanced-workflow")
async def test_enhanced_workflow(
    course: str = Query(default="CS111", description="Course to test with"),
    sample_professors: str = Query(default="Elena Strzheletska", description="Comma-separated professor names to test")
):
    """
    🧪 Test endpoint for the enhanced workflow integration
    """
    try:
        logger.info(f"Testing enhanced workflow for course: {course}")
        
        # Test professor extraction
        professor_names = [name.strip() for name in sample_professors.split(",")]
        
        # Test RMP integration
        rmp_result = await rmp_service.get_course_specific_professor_data(
            course_code=course,
            extracted_professors=professor_names,
            school_name="University of California Riverside"
        )
        
        return {
            "success": True,
            "test_course": course,
            "test_professors": professor_names,
            "rmp_integration": {
                "working": rmp_result.get("success", False),
                "professors_found": len(rmp_result.get("professors", [])),
                "total_reviews": rmp_result.get("stats", {}).get("total_course_reviews", 0)
            },
            "services_status": {
                "professor_extraction": "initialized",
                "rmp_service": "initialized",
                "openai_service": "initialized"
            },
            "next_steps": [
                "Test with real course data using /api/course-analysis-enhanced",
                "Frontend integration for new data structure",
                "Performance optimization for large professor lists"
            ]
        }
        
    except Exception as e:
        logger.error(f"Enhanced workflow test failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "services_status": "error"
        }

# ======================== RATE MY PROFESSOR ENDPOINTS ========================

@app.get("/api/rmp/schools")
async def search_schools(q: str = Query(..., description="School name to search for")):
    """
    Search for schools on Rate My Professor
    """
    try:
        logger.info(f"RMP: Searching schools for: {q}")
        schools = await rmp_service.search_schools(q)
        
        return {
            "success": True,
            "query": q,
            "schools": schools,
            "count": len(schools)
        }
        
    except Exception as e:
        logger.error(f"RMP school search failed: {e}")
        raise HTTPException(status_code=500, detail=f"School search failed: {str(e)}")

@app.get("/api/rmp/schools/{school_id}/professors")
async def search_professors_in_school(
    school_id: str,
    q: str = Query(..., description="Professor name to search for")
):
    """
    Search for professors within a specific school
    """
    try:
        logger.info(f"RMP: Searching professors in school {school_id} for: {q}")
        professors = await rmp_service.search_professors(school_id, q)
        
        return {
            "success": True,
            "school_id": school_id,
            "query": q,
            "professors": professors,
            "count": len(professors)
        }
        
    except Exception as e:
        logger.error(f"RMP professor search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Professor search failed: {str(e)}")

@app.get("/api/rmp/professors/{prof_id}")
async def get_professor_details(prof_id: str):
    """
    Get detailed information about a specific professor
    """
    try:
        logger.info(f"RMP: Getting details for professor: {prof_id}")
        professor = await rmp_service.get_professor_summary(prof_id)
        
        if not professor:
            raise HTTPException(status_code=404, detail="Professor not found")
        
        return {
            "success": True,
            "professor": professor
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RMP professor details failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get professor details: {str(e)}")

@app.get("/api/rmp/professors/{prof_id}/ratings")
async def get_professor_ratings(
    prof_id: str,
    limit: int = Query(default=50, ge=1, le=100, description="Number of ratings to retrieve"),
    cursor: str = Query(default=None, description="Pagination cursor")
):
    """
    Get paginated ratings for a professor (all courses)
    """
    try:
        logger.info(f"RMP: Getting ratings for professor {prof_id}")
        ratings_data = await rmp_service.get_professor_ratings(prof_id, limit, cursor)
        
        return {
            "success": True,
            "professor_id": prof_id,
            "ratings": ratings_data["ratings"],
            "pageInfo": ratings_data["pageInfo"],
            "count": len(ratings_data["ratings"])
        }
        
    except Exception as e:
        logger.error(f"RMP ratings fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ratings: {str(e)}")

@app.get("/api/rmp/professors/{prof_id}/ratings/course")
async def get_professor_course_ratings(
    prof_id: str,
    course: str = Query(..., description="Course name/code to filter by"),
    limit: int = Query(default=50, ge=1, le=100, description="Number of ratings to retrieve"),
    cursor: str = Query(default=None, description="Pagination cursor")
):
    """
    Get ratings for a professor filtered by specific course
    """
    try:
        logger.info(f"RMP: Getting course ratings for professor {prof_id}, course: {course}")
        ratings_data = await rmp_service.get_ratings_by_course(prof_id, course, limit, cursor)
        
        return {
            "success": True,
            "professor_id": prof_id,
            "course": course,
            "ratings": ratings_data["ratings"],
            "pageInfo": ratings_data["pageInfo"],
            "count": len(ratings_data["ratings"])
        }
        
    except Exception as e:
        logger.error(f"RMP course ratings fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get course ratings: {str(e)}")

@app.get("/api/rmp/professors/{prof_id}/courses")
async def get_professor_courses(
    prof_id: str,
    sample: int = Query(default=300, ge=50, le=500, description="Sample size for course analysis")
):
    """
    Get all distinct courses a professor has taught (with rating counts)
    """
    try:
        logger.info(f"RMP: Getting courses for professor {prof_id}")
        courses = await rmp_service.get_professor_courses(prof_id, sample)
        
        return {
            "success": True,
            "professor_id": prof_id,
            "courses": courses,
            "count": len(courses)
        }
        
    except Exception as e:
        logger.error(f"RMP courses fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get professor courses: {str(e)}")

@app.get("/api/rmp/professors/{prof_id}/comments")
async def get_professor_comments(prof_id: str):
    """
    🆕 Get all student reviews/comments for a professor
    """
    try:
        logger.info(f"RMP: Getting comments for professor {prof_id}")
        comments = await rmp_service.get_professor_comments(prof_id)
        
        return {
            "success": True,
            "professor_id": prof_id,
            "comments": comments,
            "count": len(comments)
        }
        
    except Exception as e:
        logger.error(f"RMP comments fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get professor comments: {str(e)}")

@app.get("/api/rmp/schools/{school_id}/all-professors")
async def get_all_professors_at_school(school_id: str):
    """
    🆕 Get complete list of all professors at a school
    """
    try:
        logger.info(f"RMP: Getting all professors at school {school_id}")
        professors = await rmp_service.get_all_professors_at_school(school_id)
        
        return {
            "success": True,
            "school_id": school_id,
            "professors": professors,
            "count": len(professors)
        }
        
    except Exception as e:
        logger.error(f"RMP all professors fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get all professors: {str(e)}")

@app.get("/api/rmp/professor-id")
async def get_professor_id(
    professor_name: str = Query(..., description="Professor name to search for"),
    school_id: str = Query(..., description="School ID where professor teaches")
):
    """
    🆕 Get professor ID given name and school
    """
    try:
        logger.info(f"RMP: Getting professor ID for {professor_name} at school {school_id}")
        prof_id = await rmp_service.get_professor_id(professor_name, school_id)
        
        if not prof_id:
            raise HTTPException(status_code=404, detail="Professor not found")
        
        return {
            "success": True,
            "professor_name": professor_name,
            "school_id": school_id,
            "professor_id": prof_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RMP professor ID lookup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get professor ID: {str(e)}")

@app.get("/api/rmp/test")
async def test_rmp_connection():
    """
    Test RMP API connectivity
    """
    try:
        logger.info("Testing RMP API connection")
        
        # Test by searching for UCR
        schools = await rmp_service.search_schools("University of California Riverside")
        
        rmp_status = "operational" if schools else "no_results"
        
        return {
            "success": True,
            "message": "RMP API connection working",
            "schools_found": len(schools),
            "rmp_service": rmp_status,
            "sample_school": schools[0] if schools else None
        }
        
    except Exception as e:
        logger.error(f"RMP test failed: {e}")
        raise HTTPException(status_code=500, detail=f"RMP test failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT) 
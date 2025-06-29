from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List
from pydantic import BaseModel
import logging
from config import config
from reddit_service import reddit_service
from openai_service import openai_service
from sheets_service import SheetsService

# setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# create services
sheets_service = SheetsService()

# request models
class PostIdsRequest(BaseModel):
    post_ids: List[str]

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

@app.get("/api/search")
async def search_course_info(
    keyword: str = Query(..., description="Course ID or name to search for"),
    limit: int = Query(default=50, ge=1, le=100, description="Maximum posts to retrieve")
) -> Dict[str, Any]:
    """
    search for posts about ucr courses from r/ucr
    """
    try:
        logger.info(f"Searching for keyword: {keyword} with limit: {limit}")
        
        if not keyword.strip():
            raise HTTPException(status_code=400, detail="Keyword cannot be empty")
        
        # search reddit using our service
        results = reddit_service.search_course_info(keyword.strip(), limit)
        
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
    limit: int = Query(default=20, ge=1, le=50, description="Maximum comments to retrieve")
):
    """
    get comments from a specific reddit post
    """
    try:
        logger.info(f"Getting comments for post: {post_id}")
        
        comments = reddit_service.get_post_comments(post_id, limit)
        
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
        # test reddit connection
        is_readonly = reddit_service.reddit.read_only
        
        return {
            "status": "healthy",
            "reddit_connection": "connected",
            "reddit_readonly": is_readonly,
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
    max_comments: int = Query(default=50, ge=1, le=200, description="Maximum comments to retrieve for AI analysis")
):
    """
    get full post content for ai analysis (no limits on text length)
    """
    try:
        logger.info(f"Getting full content for AI analysis: {post_id}")
        
        full_content = reddit_service.get_full_post_content_for_ai(post_id, max_comments)
        
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
    max_comments_per_post: int = Query(default=30, ge=1, le=100, description="Max comments per post")
):
    """
    get content from multiple posts for ai analysis
    """
    try:
        post_ids = request.post_ids
        logger.info(f"Getting full content for {len(post_ids)} posts for AI analysis")
        
        if len(post_ids) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 posts allowed per request")
        
        full_content = reddit_service.get_multiple_posts_for_ai(post_ids, max_comments_per_post)
        
        return {
            "success": True,
            "data": full_content
        }
        
    except Exception as e:
        logger.error(f"Error getting multiple posts for AI: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get multiple posts: {str(e)}")

@app.get("/api/course-analysis-structured")
async def get_structured_course_analysis(
    keyword: str = Query(..., description="Course ID or name to analyze"),
    max_posts: int = Query(default=20, ge=1, le=100, description="Maximum posts to analyze"),
    max_comments_per_post: int = Query(default=30, ge=1, le=100, description="Max comments per post")
):
    """
    🎯 NEW: Returns structured JSON data instead of markdown for custom frontend components
    """
    try:
        logger.info(f"Structured course analysis for: {keyword}")
        
        if not keyword.strip():
            raise HTTPException(status_code=400, detail="Course keyword cannot be empty")
        
        # Same data gathering as regular endpoint
        search_results = reddit_service.search_course_info(keyword.strip(), max_posts)
        
        if not search_results or search_results["total_posts"] == 0:
            ucr_data = sheets_service.format_for_ai_analysis(keyword.strip())
            
            if not ucr_data or ucr_data.strip() == "":
                return {
                    "success": False,
                    "error": "No data found",
                    "message": f"No Reddit posts or UCR database entries found for '{keyword}'"
                }
            
            course_data = {
                "course": keyword.strip(),
                "posts": [],
                "ucr_database": ucr_data
            }
            
            # Use structured analysis method
            analysis = openai_service.analyze_course_discussions_structured(course_data)
            
            return {
                "success": True,
                "posts_analyzed": 0,
                "ucr_database_included": True,
                "raw_data": {
                    "course": keyword.strip(),
                    "posts": [],
                    "ucr_database": ucr_data
                },
                "analysis": analysis
            }
        
        # Get full content from reddit posts
        ucr_posts = search_results["subreddits"].get("ucr", {}).get("posts", [])
        
        if not ucr_posts:
            return {
                "success": False,
                "error": "No UCR posts found",
                "message": f"No posts found in r/ucr for '{keyword}'"
            }
        
        post_ids = [post["id"] for post in ucr_posts[:max_posts]]
        full_content_data = reddit_service.get_multiple_posts_for_ai(post_ids, max_comments_per_post)
        
        if not full_content_data["success"]:
            return {
                "success": False,
                "error": "Failed to get full Reddit content"
            }
        
        posts_data = full_content_data["data"]
        ucr_database_data = sheets_service.format_for_ai_analysis(keyword.strip())
        
        course_data = {
            "course": keyword.strip(),
            "posts": posts_data,
            "ucr_database": ucr_database_data if ucr_database_data else ""
        }
        
        # Use structured analysis method
        analysis = openai_service.analyze_course_discussions_structured(course_data)
        
        return {
            "success": True,
            "posts_analyzed": len(posts_data),
            "ucr_database_included": bool(ucr_database_data),
            "raw_data": {
                "course": keyword.strip(),
                "posts": posts_data,
                "ucr_database": ucr_database_data if ucr_database_data else ""
            },
            "analysis": analysis
        }
        
    except Exception as e:
        logger.error(f"Structured course analysis failed for {keyword}: {e}")
        raise HTTPException(status_code=500, detail=f"Course analysis failed: {str(e)}")

@app.get("/api/course-analysis")
async def get_complete_course_analysis(
    keyword: str = Query(..., description="Course ID or name to analyze"),
    max_posts: int = Query(default=20, ge=1, le=100, description="Maximum posts to analyze"),
    max_comments_per_post: int = Query(default=30, ge=1, le=100, description="Max comments per post")
):
    """
    🎯 the main endpoint: search course → get content → get ucr database → ai analysis
    """
    try:
        logger.info(f"Complete course analysis for: {keyword}")
        
        if not keyword.strip():
            raise HTTPException(status_code=400, detail="Course keyword cannot be empty")
        
        # step 1: search reddit for posts about this course
        search_results = reddit_service.search_course_info(keyword.strip(), max_posts)
        
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
            ai_analysis = openai_service.analyze_course_discussions(course_data)
            
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
        
        # get full content for ai analysis
        full_content_data = reddit_service.get_multiple_posts_for_ai(post_ids, max_comments_per_post)
        
        if not full_content_data["success"]:
            return {
                "success": False,
                "error": "Failed to get full Reddit content",
                "message": "Could not retrieve full post content for analysis"
            }
        
        posts_data = full_content_data["data"]
        
        # step 3: get ucr database data
        ucr_database_data = sheets_service.format_for_ai_analysis(keyword.strip())
        
        # step 4: combine data for ai analysis
        course_data = {
            "course": keyword.strip(),
            "posts": posts_data,
            "ucr_database": ucr_database_data if ucr_database_data else ""
        }
        
        # step 5: run ai analysis
        ai_analysis = openai_service.analyze_course_discussions(course_data)
        
        return {
            "success": True,
            "posts_analyzed": len(posts_data),
            "ucr_database_included": bool(ucr_database_data),
            "raw_data": {
                "course": keyword.strip(),
                "posts": posts_data,
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
            "reviews": reviews[:5],  # first 5 reviews only
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
        # test basic reddit connection
        subreddit = reddit_service.reddit.subreddit("ucr")
        posts = list(subreddit.hot(limit=1))
        
        return {
            "success": True,
            "message": "Reddit connection working",
            "test_post_title": posts[0].title if posts else "No posts found"
        }
        
    except Exception as e:
        logger.error(f"Reddit test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Reddit test failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT) 
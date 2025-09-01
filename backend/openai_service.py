from openai import AsyncOpenAI
from typing import Dict, Any, List
from config import config
import logging
import json
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AsyncOpenAIService:
    def __init__(self):
        """setup async openai client"""
        try:
            self.client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
            self.model = config.OPENAI_MODEL
            logger.info(f"Async OpenAI client initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Async OpenAI client: {e}")
            raise
    
    async def analyze_course_discussions_structured(self, course_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        🆕 ENHANCED: Analyze course discussions with RMP integration
        """
        try:
            course = course_data.get("course", "Unknown Course")
            posts = course_data.get("posts", [])
            ucr_database = course_data.get("ucr_database", "")
            rmp_data = course_data.get("rmp_data", {})
            
            if not posts and not ucr_database and not rmp_data.get("professors"):
                return {
                    "success": False,
                    "error": "No data to analyze"
                }
            
            logger.info(f"🚀 Enhanced analysis: {len(posts)} Reddit posts + UCR database + {len(rmp_data.get('professors', []))} RMP professors for course: {course}")
            
            # Format data for AI
            formatted_reddit_data = self._format_posts_for_ai(posts) if posts else ""
            formatted_rmp_data = self._format_rmp_data_for_ai(rmp_data) if rmp_data.get("enabled") else ""
            
            # Use enhanced prompt if we have RMP data, otherwise use basic prompt
            if formatted_rmp_data:
                prompt = self._create_enhanced_structured_analysis_prompt(course, formatted_reddit_data, ucr_database, formatted_rmp_data)
                system_content = "You are an expert UCR academic advisor who analyzes student discussions, database reviews, and Rate My Professors data to provide comprehensive course insights. You MUST merge all data sources (Reddit, UCR Database, RMP) into a unified analysis. CRITICAL: You must return ONLY valid JSON - no markdown, no explanations, no text outside the JSON object."
            else:
                prompt = self._create_structured_analysis_prompt(course, formatted_reddit_data, ucr_database)
                system_content = "You are an expert UCR academic advisor who analyzes student discussions to provide structured course data. CRITICAL: You must return ONLY valid JSON - no markdown, no explanations, no text outside the JSON object."
            
            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": system_content
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Lower temperature for more consistent JSON output
                max_tokens=12000  # Increased to ensure advice section isn't truncated
            )
            
            # Parse JSON response
            try:
                ai_response = response.choices[0].message.content
                structured_data = json.loads(ai_response)
            except json.JSONDecodeError as e:
                # Log the actual response that failed to parse for debugging
                logger.error(f"JSON parsing failed: {e}")
                logger.error(f"AI Response (first 500 chars): {response.choices[0].message.content[:500]}")
                logger.error(f"AI Response (last 500 chars): {response.choices[0].message.content[-500:]}")
                
                # Try to clean the JSON and parse again
                cleaned_response = ai_response.strip()
                
                # Remove any markdown code blocks if present
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response[3:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                
                cleaned_response = cleaned_response.strip()
                
                try:
                    structured_data = json.loads(cleaned_response)
                    logger.info("Successfully parsed JSON after cleaning")
                except json.JSONDecodeError:
                    logger.warning("JSON cleaning failed, returning minimal structured response")
                    # Return minimal structured response instead of falling back
                    structured_data = {
                        "overall_sentiment": "Unable to analyze - please try again",
                        "difficulty": {"rank": "Unknown", "reasons": ["Analysis failed"]},
                        "professors": [],
                        "advice": {
                            "course_specific_tips": ["Unable to generate tips - please try searching again"],
                            "resources": [],
                            "minority_opinions": []
                        },
                        "common_pitfalls": ["Analysis unavailable"]
                    }
            
            return {
                "success": True,
                "course": course,
                "analysis": structured_data
            }
            
        except Exception as e:
            logger.error(f"Enhanced structured analysis failed for course {course}: {e}")
            return {
                "success": False,
                "error": str(e),
                "course": course
            }

    async def analyze_course_discussions(self, course_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        analyze ucr course discussions using gpt
        """
        try:
            course = course_data.get("course", "Unknown Course")
            posts = course_data.get("posts", [])
            ucr_database = course_data.get("ucr_database", "")
            
            if not posts and not ucr_database:
                return {
                    "success": False,
                    "error": "No data to analyze",
                    "summary": f"No discussions or database entries found for {course}"
                }
            
            logger.info(f"Analyzing {len(posts)} Reddit posts + UCR database for course: {course}")
            
            # format reddit data for ai
            formatted_reddit_data = self._format_posts_for_ai(posts) if posts else ""
            
            # create the prompt
            prompt = self._create_analysis_prompt(course, formatted_reddit_data, ucr_database)
            
            # call openai api (async)
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert UCR academic advisor who analyzes student discussions to provide comprehensive course insights."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.3,  # keep it consistent
                max_tokens=6000   # much higher for very detailed analysis (up to 4000+ words)
            )
            
            ai_summary = response.choices[0].message.content
            
            # count posts and comments
            total_posts = len(posts)
            total_comments = sum(len(post_data.get("comments", [])) for post_data in posts)
            
            return {
                "success": True,
                "course": course,
                "ai_summary": ai_summary,
                "analysis_metadata": {
                    "total_posts_analyzed": total_posts,
                    "total_comments_analyzed": total_comments,
                    "ucr_database_included": bool(ucr_database),
                    "model_used": self.model,
                    "analysis_type": "comprehensive_course_insight_with_database"
                }
            }
            
        except Exception as e:
            logger.error(f"OpenAI analysis failed for course {course}: {e}")
            return {
                "success": False,
                "error": str(e),
                "course": course,
                "ai_summary": "Analysis temporarily unavailable. Please try again later."
            }
    
    def _format_posts_for_ai(self, posts: List[Dict[str, Any]]) -> str:
        """format reddit posts and comments for ai analysis"""
        formatted_posts = []
        
        for i, post_data in enumerate(posts, 1):
            post = post_data.get("post", {})
            comments = post_data.get("comments", [])
            
            # format post
            score = post.get('score', 0)
            post_text = f"POST: {post.get('title', 'No title')} [▲{score}] (created_utc={post.get('created_utc', 'Unknown')})\n"
            
            if post.get('selftext'):
                post_text += f"{post['selftext']}\n"
            
            # format comments
            for comment in comments:
                comment_score = comment.get('score', 0)
                post_text += f"COMMENT: [▲{comment_score}] (created_utc={comment.get('created_utc', 'Unknown')}) {comment.get('body', '')}\n"
            
            post_text += "\n"
            formatted_posts.append(post_text)
        
        return "".join(formatted_posts)
    
    def _format_rmp_data_for_ai(self, rmp_data: Dict[str, Any]) -> str:
        """Format RMP data for AI analysis"""
        try:
            if not rmp_data.get("enabled") or not rmp_data.get("professors"):
                return ""
            
            formatted_data = "RATE MY PROFESSORS DATA:\n\n"
            
            for prof in rmp_data["professors"]:
                formatted_data += f"PROFESSOR: {prof['name']}\n"
                formatted_data += f"Department: {prof['department']}\n"
                formatted_data += f"Overall Rating: {prof['overall_rating']}/5.0\n"
                formatted_data += f"Difficulty: {prof['difficulty']}/5.0\n"
                formatted_data += f"Would Take Again: {prof['would_take_again_percent']}%\n"
                formatted_data += f"Total Reviews: {prof['num_ratings']}\n"
                formatted_data += f"Course-Specific Reviews: {prof['course_reviews_count']}\n"
                formatted_data += f"RMP Profile: {prof['link']}\n\n"
                
                # Add course-specific reviews
                if prof.get("course_specific_reviews"):
                    formatted_data += "COURSE-SPECIFIC REVIEWS:\n"
                    for j, review in enumerate(prof["course_specific_reviews"]):
                        if isinstance(review, str):
                            logger.warning(f"Skipping string review at index {j}")
                            continue
                        formatted_data += f"Review {j+1}:\n"
                        formatted_data += f"Date: {review.get('date', 'Unknown')}\n"
                        formatted_data += f"Class: {review.get('class', 'Unknown')}\n"
                        formatted_data += f"Rating: {review.get('rating', 0)}/5\n"
                        formatted_data += f"Difficulty: {review.get('difficulty', 0)}/5\n"
                        if review.get('grade'):
                            formatted_data += f"Grade Received: {review['grade']}\n"
                        if review.get('would_take_again') is not None:
                            formatted_data += f"Would Take Again: {review['would_take_again']}\n"
                        if review.get('tags'):
                            formatted_data += f"Tags: {review['tags']}\n"
                        formatted_data += f"Comment: {review.get('text', 'No comment')}\n\n"
                
                formatted_data += "---\n\n"
            
            return formatted_data
            
        except Exception as e:
            logger.error(f"_format_rmp_data_for_ai failed: {e}")
            return ""

    async def extract_all_professor_names(self, course_data: Dict[str, Any]) -> List[str]:
        """
        🎯 AI-POWERED COMPREHENSIVE PROFESSOR EXTRACTION
        Uses AI to smartly identify ALL professors mentioned in any context
        """
        try:
            course = course_data.get("course", "Unknown Course")
            posts = course_data.get("posts", [])
            ucr_database = course_data.get("ucr_database", "")
            
            if not posts and not ucr_database:
                return []
            
            logger.info(f"🔍 AI-powered professor extraction for {course}")
            
            # Format data for AI analysis
            formatted_reddit_data = self._format_posts_for_ai(posts) if posts else ""
            
            # Create specialized professor extraction prompt
            prompt = f"""You are a professor name extraction specialist. Your job is to find EVERY professor name mentioned in the provided data, no matter how they're referenced.

### TASK: Extract ALL Professor Names
Find every professor, instructor, or teacher mentioned in ANY context, including:
- Full names (e.g., "Elena Strzheletska", "Yihan Sun", "Marek Chrobak")
- Partial names (e.g., "Elena", "Sun", "Chrobak") 
- Casual mentions (e.g., "took it with Sun", "Elena's class", "Chrobak taught it")
- In recommendations (e.g., "avoid Sun", "Elena is good")
- In comparisons (e.g., "better than Chrobak")
- In any other context where a professor is referenced

### IMPORTANT EXTRACTION RULES:
1. **Be COMPREHENSIVE** - don't miss any professor mentions
2. **Include partial names** - if someone says "Elena" in a course context, include "Elena"
3. **Look in ALL content** - post titles, post text, comments, database reviews
4. **Expand obvious abbreviations** - "Prof Smith" → "Smith"
5. **Context matters** - names mentioned near course/class keywords are likely professors
6. **Include nicknames/informal names** - students often use first names only

### OUTPUT FORMAT:
Return a JSON array of professor names ONLY:
["Professor Name 1", "Professor Name 2", "Professor Name 3"]

### EXAMPLES OF WHAT TO EXTRACT:
- "I took CS111 with Elena" → Extract: "Elena"
- "Yihan Sun's class was okay" → Extract: "Yihan Sun"  
- "Chrobak is tough" → Extract: "Chrobak"
- "Professor Smith teaches this" → Extract: "Smith"
- "avoid taking it with Johnson" → Extract: "Johnson"

### DATA TO ANALYZE:

REDDIT POSTS AND COMMENTS:
{formatted_reddit_data if (isinstance(formatted_reddit_data, str) and formatted_reddit_data.strip()) else "No Reddit data available"}

UCR DATABASE REVIEWS:
{ucr_database if (isinstance(ucr_database, str) and ucr_database.strip()) else "No database data available"}

EXTRACT ALL PROFESSOR NAMES AS JSON ARRAY:"""

            # Call OpenAI for professor extraction
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a specialized professor name extraction AI. Extract ALL professor names mentioned in any context, including partial names and casual references."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=1000
            )
            
            # Parse the response
            try:
                import json
                extracted_names = json.loads(response.choices[0].message.content)
                if isinstance(extracted_names, list):
                    # Clean and filter names
                    cleaned_names = []
                    for name in extracted_names:
                        if isinstance(name, str) and len(name.strip()) > 1:
                            cleaned_name = name.strip().title()
                            if cleaned_name not in cleaned_names:
                                cleaned_names.append(cleaned_name)
                    
                    logger.info(f"✅ AI extracted {len(cleaned_names)} professor names: {cleaned_names}")
                    return cleaned_names
                else:
                    logger.warning("AI returned non-list format for professor names")
                    return []
                    
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI professor extraction response: {e}")
                return []
                
        except Exception as e:
            logger.error(f"AI professor extraction failed: {e}")
            return []

    async def filter_professor_data_by_course(self, filter_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        🎯 AI-POWERED COURSE FILTERING
        Filters professor-related Reddit posts and sheets data to only include content relevant to a specific course
        """
        try:
            professor_name = filter_data.get("professor_name", "")
            course_filter = filter_data.get("course_filter", "")
            posts = filter_data.get("posts", [])
            sheets_data = filter_data.get("sheets_data", "")
            
            logger.info(f"🔍 Filtering professor {professor_name} data for course {course_filter}")
            
            # Format data for AI analysis
            formatted_reddit_data = self._format_posts_for_ai(posts) if posts else ""
            
            # Ensure it's a string to prevent .strip() errors
            if not isinstance(formatted_reddit_data, str):
                formatted_reddit_data = str(formatted_reddit_data) if formatted_reddit_data else ""
            
            # Ensure sheets_data is a string  
            if not isinstance(sheets_data, str):
                sheets_data = str(sheets_data) if sheets_data else ""
            
            # Create filtering prompt
            prompt = f"""You are a data filtering specialist. Your job is to filter content about Professor {professor_name} to only include content that discusses their teaching of course {course_filter}.

### TASK: Filter Content by Course Relevance
Filter the provided Reddit posts/comments and database entries to only include content where:
1. Professor {professor_name} is discussed in the context of teaching {course_filter}
2. Students mention taking {course_filter} with {professor_name}
3. Reviews or experiences specifically about {course_filter} taught by {professor_name}

### FILTERING RULES:
- **INCLUDE**: Content that clearly discusses {professor_name} teaching {course_filter}
- **INCLUDE**: Student experiences taking {course_filter} with {professor_name}
- **INCLUDE**: Reviews of {professor_name}'s {course_filter} class
- **EXCLUDE**: General mentions of {professor_name} without {course_filter} context
- **EXCLUDE**: Content about {professor_name} teaching other courses
- **EXCLUDE**: Content about other professors teaching {course_filter}

### OUTPUT FORMAT:
Return JSON with this structure:
{{
    "filtered_posts": [
        // Only posts/comments relevant to {professor_name} + {course_filter}
    ],
    "filtered_sheets": "Only database entries relevant to {professor_name} + {course_filter}",
    "filtering_summary": "Brief explanation of what was filtered and why"
}}

### DATA TO FILTER:

REDDIT POSTS AND COMMENTS:
{formatted_reddit_data if (isinstance(formatted_reddit_data, str) and formatted_reddit_data.strip()) else "No Reddit data to filter"}

SHEETS DATABASE:
{sheets_data if (isinstance(sheets_data, str) and sheets_data.strip()) else "No sheets data to filter"}

RETURN FILTERED DATA AS JSON:

**IMPORTANT:** Escape all quotes in text as \" and replace newlines with spaces."""

            # Call OpenAI for filtering
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a specialized content filtering AI. Filter data to only include content relevant to a specific professor teaching a specific course."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=4000
            )
            
            # Parse the response
            try:
                filtered_result = json.loads(response.choices[0].message.content)
                logger.info(f"✅ Successfully filtered data for {professor_name} + {course_filter}")
                return {
                    "success": True,
                    "filtered_posts": filtered_result.get("filtered_posts", []),
                    "filtered_sheets": filtered_result.get("filtered_sheets", ""),
                    "filtering_summary": filtered_result.get("filtering_summary", "")
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI filtering response: {e}")
                return {
                    "success": False,
                    "error": "Failed to parse filtering results",
                    "filtered_posts": posts,  # Return original data
                    "filtered_sheets": sheets_data
                }
                
        except Exception as e:
            logger.error(f"AI filtering failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "filtered_posts": posts,  # Return original data
                "filtered_sheets": sheets_data
            }

    async def filter_ucr_reviews_for_professor(self, professor_name: str, ucr_reviews_data: str, course_filter: str = "") -> Dict[str, Any]:
        """
        🎯 AI-POWERED UCR DATABASE FILTERING
        Filters UCR database reviews to only include mentions of the specific professor
        """
        try:
            # Ensure ucr_reviews_data is a string
            if not isinstance(ucr_reviews_data, str):
                ucr_reviews_data = str(ucr_reviews_data) if ucr_reviews_data else ""
                
            if not ucr_reviews_data.strip():
                return {
                    "success": True,
                    "professor_mentions": "",
                    "filtering_summary": "No UCR database data to filter"
                }
            
            context = f" teaching {course_filter}" if course_filter else ""
            logger.info(f"🔍 Filtering UCR database reviews for professor {professor_name}{context}")
            
            # Create filtering prompt
            prompt = f"""You are a review filtering specialist. Your job is to find all reviews in the UCR Class Database that mention Professor {professor_name}{context}.

### TASK: Find Professor Mentions in UCR Reviews
Extract all reviews that mention Professor {professor_name} in ANY context, including:
1. Direct mentions of the professor's name (full or partial)
2. Reviews where students mention taking classes with this professor
3. Comments about this professor's teaching style, grading, etc.
4. Any reference to this professor in course reviews

### FILTERING RULES:
- **INCLUDE**: Any review that mentions "{professor_name}" (full name, first name, or last name)
- **INCLUDE**: Reviews mentioning this professor's teaching approach, personality, or grading
{f"- **FOCUS**: If course filter '{course_filter}' is specified, prioritize reviews from that course" if course_filter else ""}
- **EXCLUDE**: Reviews that don't mention this professor at all
- **EXCLUDE**: Generic course reviews with no professor references

### OUTPUT FORMAT:
Return JSON with this structure:
{{
    "professor_mentions": "All UCR database reviews that mention Professor {professor_name}, formatted clearly",
    "filtering_summary": "Brief explanation of what was found and filtered",
    "courses_mentioned": ["List of course codes where this professor was mentioned"]
}}

### UCR DATABASE REVIEWS TO FILTER:

{ucr_reviews_data}

RETURN FILTERED RESULTS AS JSON:

**CRITICAL:** All text must have quotes escaped as \" and no newlines."""

            # Call OpenAI for filtering
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a specialized professor mention detection AI. Extract all reviews that mention a specific professor from UCR class database reviews."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=3000
            )
            
            # Parse the response
            try:
                ai_response = response.choices[0].message.content
                filtered_result = json.loads(ai_response)
                logger.info(f"✅ Successfully filtered UCR reviews for {professor_name}")
                return {
                    "success": True,
                    "professor_mentions": filtered_result.get("professor_mentions", ""),
                    "filtering_summary": filtered_result.get("filtering_summary", ""),
                    "courses_mentioned": filtered_result.get("courses_mentioned", [])
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI UCR filtering response: {e}")
                logger.error(f"UCR Filter Response (first 500 chars): {response.choices[0].message.content[:500]}")
                logger.error(f"UCR Filter Response (last 500 chars): {response.choices[0].message.content[-500:]}")
                return {
                    "success": False,
                    "error": "Failed to parse filtering results",
                    "professor_mentions": ucr_reviews_data  # Return original data
                }
                
        except Exception as e:
            logger.error(f"AI UCR filtering failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "professor_mentions": ucr_reviews_data  # Return original data
            }

    async def analyze_professor_comprehensive(self, professor_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        🎓 COMPREHENSIVE PROFESSOR ANALYSIS
        Creates a detailed professor profile from RMP, Reddit, and Google Sheets data
        """
        try:
            professor_name = professor_data.get("professor_name", "Unknown Professor")
            course_filter = professor_data.get("course_filter", "")
            posts = professor_data.get("posts", [])
            ucr_database = professor_data.get("ucr_database", "")
            rmp_data = professor_data.get("rmp_data", {})
            
            logger.info(f"🎓 Comprehensive analysis for Professor {professor_name}" + (f" (course: {course_filter})" if course_filter else ""))
            
            # Format data for AI
            try:
                if posts:
                    formatted_reddit_data = self._format_posts_for_ai(posts)
                else:
                    formatted_reddit_data = ""
            except Exception as e:
                logger.error(f"Error during Reddit formatting: {e}")
                formatted_reddit_data = ""
             
            try:
                if rmp_data.get("enabled"):
                    formatted_rmp_data = self._format_rmp_data_for_ai(rmp_data)
                else:
                    formatted_rmp_data = ""
            except Exception as e:
                logger.error(f"Error during RMP formatting: {e}")
                formatted_rmp_data = ""
            
            # Create professor analysis prompt
            try:
                prompt = self._create_professor_analysis_prompt(
                    professor_name, 
                    course_filter, 
                    formatted_reddit_data, 
                    ucr_database, 
                    formatted_rmp_data
                )
            except Exception as e:
                logger.error(f"Error during prompt creation: {e}")
                raise e
            
            # Call OpenAI API
            try:
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert professor analysis specialist who creates comprehensive professor profiles from multiple data sources. Focus on honest, unbiased analysis that helps students make informed decisions."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,
                    max_tokens=8000
                )
            except Exception as e:
                logger.error(f"Error during OpenAI API call: {e}")
                raise e
            
            # Parse JSON response
            try:
                analysis_result = json.loads(response.choices[0].message.content)
                
                return {
                    "success": True,
                    "professor_name": professor_name,
                    "course_filter": course_filter,
                    "analysis": analysis_result
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse professor analysis JSON: {e}")
                return {
                    "success": False,
                    "error": "Failed to parse analysis results",
                    "raw_response": response.choices[0].message.content
                }
                
        except Exception as e:
            logger.error(f"Professor comprehensive analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "professor_name": professor_name
            }

    def _create_structured_analysis_prompt(self, course: str, formatted_reddit_data: str, ucr_database_data: str = "", formatted_rmp_data: str = "") -> str:
        """create prompt for structured JSON data output"""
        return f"""You are an assistant that analyzes UCR course data and returns structured JSON.

### Context
Course ID: {course}
Reddit data: {formatted_reddit_data[:1000] if formatted_reddit_data.strip() else "No Reddit data"}...
UCR Database: {ucr_database_data[:1000] if ucr_database_data.strip() else "No database data"}...

### Task
IMPORTANT INSTRUCTIONS:
- PRIORITIZE RECENT CONTENT: When analyzing Reddit posts and database reviews, give much higher weight to recent posts/reviews (higher created_utc for Reddit, later dates for database)
- SORT PROFESSORS BY RATING: Order professors array from highest to lowest star rating
- Be comprehensive and detailed in your analysis

### CRITICAL: PROFESSOR RATING SYSTEM
For each professor, you MUST:
1. **COLLECT ALL AVAILABLE REVIEWS**: Include ALL mentions of the professor from Reddit posts, comments, and UCR database entries. For popular classes, aim for 5-10+ reviews per professor when available.

2. **RATE EACH INDIVIDUAL REVIEW** on a strict 1-5 scale:
   - **5/5**: Overwhelmingly positive (e.g., "Amazing professor, best class ever, learned so much")
   - **4/5**: Mostly positive with minor issues (e.g., "Good teacher, engaging lectures, tough but fair")
   - **3/5**: Mixed/neutral (e.g., "Okay professor, some good some bad points")
   - **2/5**: Mostly negative with some positives (e.g., "Poor teaching but helpful in office hours")
   - **1/5**: Overwhelmingly negative (e.g., "Terrible professor, poor teaching, changes things last minute")

3. **CALCULATE AVERAGE**: Add up all individual review ratings and divide by number of reviews. Round to 1 decimal place.

4. **EXAMPLE**: If reviews are 1/5, 2/5, 4/5 = (1+2+4)/3 = 2.3/5 average rating

### RATING EXAMPLES:
- "She does a poor job at teaching, speeds through slides, changes homework questions last minute" = **1/5**
- "Just study and put in the work. Go to office hours if you have questions" = **3/5** 
- "She is strict but helpful if you ask questions" = **3/5**
- "Amazing professor, clear explanations, fair exams" = **5/5**

### DIFFICULTY SECTION INSTRUCTIONS:
For the "difficulty" explanation array:
- **ONLY include actual student quotes and reasoning** from Reddit posts/comments
- **DO NOT reference database ratings** - users can see those themselves
- **FORMATTING RULES:**
  - Use quotation marks ONLY for direct quotes: "Exact student words from posts"
  - For general observations/paraphrases, NO quotes: Heavy coding assignments with tight deadlines
  - NO "STUDENT QUOTE:" prefix - just the content
- Focus on WHY students find it difficult/easy based on their actual experiences

Analyze the data and return ONLY valid JSON in this exact format:

{{
    "overall_sentiment": {{
        "summary": "One sentence overall vibe",
        "workload": {{
            "hours_per_week": "2-4 hours",
            "assignments": "Weekly quizzes, 2 midterms, final",
            "time_commitment": "Low to moderate"
        }},
        "minority_opinions": ["Any contrarian views about course overall"]
    }},
    "difficulty": {{
        "rank": "Easy",
        "rating": 2.5,
        "max_rating": 10,
        "explanation": ["\"CS111 is one of the hardest classes with lots of proofs and tight quizzes\"", "Heavy coding assignments with unrealistic deadlines", "Professor moves through material too quickly"],
        "minority_opinions": ["Any contrarian difficulty opinions"]
    }},
    "professors": [
        {{
            "name": "Professor Name",
            "rating": 2.3,
            "max_rating": 5,
            "reviews": [
                {{"source": "database", "date": "2024-01-15", "text": "Review text here"}},
                {{"source": "reddit", "date": "2024-02-20", "text": "Review text here"}},
                {{"source": "database", "date": "2024-03-10", "text": "Another review"}},
                {{"source": "reddit", "date": "2024-04-15", "text": "More review text"}}
            ],
            "minority_opinions": ["Any contrarian opinions about this prof"]
        }}
    ],
    "advice": {{
        "course_specific_tips": ["Tip 1", "Tip 2", "Tip 3"],
        "resources": ["Resource 1", "Resource 2"],
        "minority_opinions": ["Alternative study strategies"]
    }},
    "common_pitfalls": ["Pitfall 1", "Pitfall 2", "Pitfall 3"]
}}

### 🚨 MANDATORY: ALL SECTIONS REQUIRED
You MUST include ALL sections in your JSON response:
- overall_sentiment (with summary, workload, minority_opinions)
- difficulty (with rank, rating, explanation)  
- professors (array with name, rating, reviews)
- **advice** (with course_specific_tips, resources, minority_opinions) ← REQUIRED
- **common_pitfalls** (array of pitfall strings) ← REQUIRED

### CRITICAL JSON FORMATTING RULES
1. **VALID JSON ONLY**: Return ONLY valid JSON, no markdown, no explanations, no text outside the JSON object
2. **ESCAPE QUOTES**: Use \\" for quotes inside strings (e.g., "She said \\"hello\\"")
3. **NO NEWLINES IN STRINGS**: Replace actual newlines with \\n in strings
4. **NO TRAILING COMMAS**: Ensure no comma after the last item in objects/arrays
5. **PROPER NESTING**: Ensure all brackets and braces are properly closed
6. **COMPLETE RESPONSE**: Include ALL sections listed above - do not truncate

Return ONLY the JSON object, no other text.

### REDDIT DATA:
{formatted_reddit_data if formatted_reddit_data.strip() else "No Reddit discussions found."}

### UCR DATABASE DATA:
{ucr_database_data if ucr_database_data.strip() else "No UCR database entries found."}"""

    def _create_analysis_prompt(self, course: str, formatted_reddit_data: str, ucr_database_data: str = "") -> str:
        """create the prompt for openai"""
        return f"""You are an assistant that turns crowd-sourced information about a UCR course into a clear, student-friendly cheat-sheet.

### Context
Course ID: {course}

1. **Reddit data** – every relevant post and top-level comment pulled from r/UCR.  
   • Each block starts with "POST:" or "COMMENT:".  
   • Up-votes are in square brackets, e.g. [▲123] or [+45].  
   • Unix timestamp appears as (created_utc=…).

2. **UCR Student Database reviews** – JSON-like text that lists individual reviews, their `date`, `comments`, `individual_difficulty`, and the overall `average_difficulty`.

### Task
1. Read both data sets.  
2. **Prioritise newer items**: higher `created_utc` for Reddit, later `date` for database.  
3. Break ties with up-votes (Reddit) or `individual_difficulty` extremes (database).  
4. Ignore off-topic chatter, memes, or duplicates.  
5. **Capture both strengths and weaknesses** that appear repeatedly (≥ 2 similar comments) and any strong minority views.  
6. ***STRICT PROFESSOR RATING SYSTEM*** - For each professor:
   • **COLLECT ALL AVAILABLE REVIEWS**: Include ALL mentions from Reddit posts, comments, and UCR database. For popular classes, aim for 5-10+ reviews per professor.
   • **RATE EACH INDIVIDUAL REVIEW** on 1-5 scale:
     - 5★ = Overwhelmingly positive ("Amazing professor, best class ever")
     - 4★ = Mostly positive with minor issues ("Good teacher, tough but fair")  
     - 3★ = Mixed/neutral ("Okay professor, some good some bad")
     - 2★ = Mostly negative with some positives ("Poor teaching but helpful in office hours")
     - 1★ = Overwhelmingly negative ("Terrible professor, poor teaching, changes things last minute")
   • **CALCULATE AVERAGE**: Add all review ratings, divide by number of reviews, round to 1 decimal.
   • **EXAMPLE**: Reviews of 1★, 2★, 4★ = (1+2+4)/3 = 2.3★ average
7. Write output with the exact markdown headings below. If a section has no info, keep the heading and write "No clear info."

### Output format (markdown)

#### Overall Sentiment
One-sentence vibe (e.g., "Mostly positive but time-consuming").

**Workload & Time Commitment:** Include specific details about hours per week, number of projects/exams, key pain points, and how time-consuming the course is.

#### Difficulty
– Rank: *Easy / Moderate / Hard / Very Hard*  
– 2-4 bullet points explaining why (use quotes only for direct quotes, no quotes for general observations).

#### Frequent Instructors & Student Reviews
| Professor | ★ Rating | All Available Reviews<sup>†</sup> |
|-----------|---------|-------------------------------------|
| Name      | ★★☆☆☆   | 1. 📊 2024-11-15 – "Poor teaching, changes things last minute."<br>2. 👽 2025-03-02 – "Helpful in office hours but lectures unclear."<br>3. 📊 2024-09-20 – "Very strict but fair if you put in effort."<br>4. 👽 2024-12-01 – "Difficult class but learned a lot." |

<sup>†</sup> Include ALL available reviews (aim for 5-10+ per professor for popular classes). Prefix with **📊** for database or **👽** for Reddit, include date (YYYY-MM-DD).

#### Advice & Tips for Success
**COURSE-SPECIFIC ONLY:** List practical tips that are unique to this exact course/professors. Avoid generic advice like "study early," "stay organized," "attend lectures" - only include tips that are specific to this course's format, professors, exams, or unique requirements.

**Recommended Resources:** Include books, websites, videos, tutoring, and other helpful resources within this section.

#### Common Pitfalls
Top 3 mistakes students warn about.

### Style rules
- Plain English.  
- Bullets ≤ 20 words.  
- **Include positive and negative viewpoints.**  
- **CRITICAL: For popular classes (ones where you are able to collect lots of info), each professor needs 5-10+ reviews when available. For small classes (aka not much info), include ALL available mentions.**
- Each professor must have **calculated average rating** based on individual review ratings (1-5 scale each).
- Quotes must show the review date and the correct icon (📊 or 👽).  
- Use Unicode stars (★) for ratings.  
- No invented facts; if unsure, write "Not mentioned."  
- Do **not** mention Reddit, up-votes, JSON, or yourself.  
- **Maximum 4000 words** total.
- **IMPORTANT: Each section should be VERY detailed and comprehensive. Aim for 200-400 words per section.**
- **NO main title or heading at the top - start directly with the first section.**
- **MINORITY OPINIONS: If you find genuine minority opinions, integrate them into the appropriate sections using this format: "*Minority opinion: [opinion text]*" - only include when there are actual minority views, don't force them.**

### REDDIT DATA:
{formatted_reddit_data if formatted_reddit_data.strip() else "No Reddit discussions found for this course."}

### UCR DATABASE DATA:
{ucr_database_data if ucr_database_data.strip() else "No UCR database entries found for this course."}"""

    def _create_enhanced_structured_analysis_prompt(self, course: str, formatted_reddit_data: str, ucr_database_data: str = "", formatted_rmp_data: str = "") -> str:
        """Create enhanced prompt with RMP data integration"""
        return f"""You are an assistant that analyzes UCR course data and returns structured JSON.

### Context
Course ID: {course}
Reddit data: {formatted_reddit_data[:800] if formatted_reddit_data.strip() else "No Reddit data"}...
UCR Database: {ucr_database_data[:800] if ucr_database_data.strip() else "No database data"}...
RMP Data: {formatted_rmp_data[:800] if formatted_rmp_data.strip() else "No RMP data"}...

### Task
CRITICAL INSTRUCTIONS:
- **BE BRUTALLY HONEST AND UNBIASED**: Do not favor positive reviews over negative ones
- **REPRESENT REALITY**: If a professor has mostly negative reviews, show negative reviews
- **NO CHERRY-PICKING**: Include reviews that accurately represent the sentiment distribution
- **AUTHENTIC RATINGS**: Calculate ratings based on actual sentiment, not artificially inflated
- PRIORITIZE RECENT CONTENT: Give higher weight to recent posts/reviews
- INTEGRATE RMP DATA: Use RMP data to enhance professor analysis
- SORT PROFESSORS BY RATING: Order from highest to lowest HONEST rating

### CRITICAL: UNBIASED PROFESSOR RATING SYSTEM
For each professor, you MUST:

1. **COLLECT ALL AVAILABLE REVIEWS**: Include ALL mentions from Reddit, UCR database, AND RMP reviews.

2. **RATE EACH REVIEW HONESTLY** on a strict 1-5 scale:
   - **5/5**: Overwhelmingly positive ("Amazing professor, best class ever, learned so much")
   - **4/5**: Mostly positive with minor issues ("Good teacher, tough but fair")
   - **3/5**: Mixed/neutral ("Okay professor, some good some bad")
   - **2/5**: Mostly negative with some positives ("Poor teaching but helpful in office hours")
   - **1/5**: Overwhelmingly negative ("Terrible professor, poor teaching, avoid at all costs")

3. **CALCULATE HONEST AVERAGE**: Add all review ratings, divide by number of reviews. Round to 1 decimal.

4. **SELECT REPRESENTATIVE REVIEWS**: Choose reviews that accurately reflect the sentiment distribution:
   - If 70% negative reviews → Show mostly negative reviews
   - If 60% positive → Show mostly positive reviews  
   - If mixed → Show balanced mix
   - **NEVER artificially balance if reality is skewed**

### REVIEW SELECTION EXAMPLES:
- Professor with 2.1/5 average (mostly negative): Show 3-4 negative reviews, 1-2 positive
- Professor with 4.2/5 average (mostly positive): Show 3-4 positive reviews, 1-2 negative
- Professor with 3.0/5 average (balanced): Show even mix of positive/negative

### RMP DATA INTEGRATION:
- Use RMP overall ratings as additional context but ALWAYS calculate your own average
- Include RMP course-specific reviews in analysis
- Label sources clearly: "reddit", "database", or "rmp" 
- **Extract RMP Profile links**: Use the "RMP Profile:" links provided in the RMP data
- RMP reviews provide detailed course-specific feedback
- **DO NOT IGNORE NEGATIVE RMP REVIEWS** - they are often the most informative

### RATING EXAMPLES (BE HONEST):
- "She does a poor job teaching, speeds through slides, changes homework last minute" = **1/5**
- "Lectures are unclear, doesn't respond to emails, grading is harsh and unfair" = **1/5**
- "Not the worst but definitely not good, hard to understand, boring lectures" = **2/5**
- "Just study and put in the work. Go to office hours if you have questions" = **3/5**
- "She is strict but helpful if you ask questions" = **3/5**
- "Good professor overall, explains well, fair grading but tough exams" = **4/5**
- "Amazing professor, clear explanations, fair exams, learned so much" = **5/5**

### DIFFICULTY SECTION:
- Include quotes from ALL sources (Reddit, database, RMP)
- Show why students find it difficult/easy based on actual experiences
- Include negative experiences if they're common

Analyze the data and return ONLY valid JSON in this exact format:

**CRITICAL JSON FORMATTING RULES:**
- Escape all quotes in text content using \"
- Replace newlines in text with \\n  
- Ensure all strings are properly quoted
- NO trailing commas
- NO comments in JSON

{{
    "overall_sentiment": {{
        "summary": "One sentence honest overall vibe",
        "workload": {{
            "hours_per_week": "2-4 hours",
            "assignments": "Weekly quizzes, 2 midterms, final",
            "time_commitment": "Low to moderate"
        }},
        "minority_opinions": ["Any contrarian views about course overall"]
    }},
    "difficulty": {{
        "rank": "Easy",
        "rating": 2.5,
        "max_rating": 10,
        "explanation": ["\"CS111 is one of the hardest classes with lots of proofs\"", "Heavy coding assignments with tight deadlines", "Professor moves through material too quickly"],
        "minority_opinions": ["Any contrarian difficulty opinions"]
    }},
    "professors": [
        {{
            "name": "Professor Name",
            "rating": 2.1,
            "max_rating": 5,
            "rmp_overall_rating": 2.1,
            "rmp_link": "Use the RMP Profile link from the data",
            "department": "Computer Science",
            "sentiment_distribution": {{"positive": 20, "neutral": 10, "negative": 70}},
            "total_reviews_analyzed": 100,
            "reviews": [
                {{"source": "rmp", "date": "2024-01-15", "text": "Worst professor I've ever had. Unclear lectures, doesn't help students.", "rating": 1, "class": "CS111"}},
                {{"source": "rmp", "date": "2024-02-20", "text": "Avoid at all costs. Teaching style is confusing and grading is unfair.", "rating": 1, "class": "CS111"}},
                {{"source": "reddit", "date": "2024-03-10", "text": "Elena is not great at explaining concepts, very rushed", "rating": 2}},
                {{"source": "rmp", "date": "2024-03-15", "text": "Difficult class but she's helpful in office hours if you ask.", "rating": 3, "class": "CS111"}},
                {{"source": "database", "date": "2024-04-01", "text": "Some people like her but I found her teaching unclear", "rating": 2}}
            ],
            "minority_opinions": ["Some students appreciate her office hours help"]
        }}
    ],
    "advice": {{
        "course_specific_tips": ["Tip 1", "Tip 2", "Tip 3"],
        "resources": ["Resource 1", "Resource 2"],
        "minority_opinions": ["Alternative study strategies"]
    }},
    "common_pitfalls": ["Pitfall 1", "Pitfall 2", "Pitfall 3"]
}}

**CRITICAL REMINDERS:**
- If professor has low rating (below 3.0), show mostly negative reviews
- If professor has high rating (above 4.0), show mostly positive reviews
- Be honest about sentiment distribution percentages
- Include total_reviews_analyzed count
- Never artificially balance reviews if reality is skewed
- Students deserve honest information to make informed decisions

**🚨 ABSOLUTELY CRITICAL - COURSE-SPECIFIC PROFESSOR FILTERING 🚨**
Before including ANY professor in the "professors" array, verify they have ACTUAL {course} data:

✅ INCLUDE Professor IF they have ANY of these for {course}:
- RMP reviews specifically labeled with "{course}" in the class field
- Reddit posts/comments mentioning them teaching {course}
- UCR database reviews about them for {course}

❌ EXCLUDE Professor IF they have:
- Zero {course}-specific reviews from ALL sources
- Only reviews for OTHER courses (like CS120B, CS014, etc. when searching {course})
- No mentions of teaching {course} anywhere in the data

**EXAMPLE FOR CS111:**
- Jeffrey McDaniel has RMP reviews for CS120B, CS014, CS161L → EXCLUDE from CS111 results
- Elena Strzheletska has RMP reviews labeled "CS111" → INCLUDE in CS111 results

DO NOT CREATE FAKE COURSE-SPECIFIC REVIEWS. If a professor has no {course} data, they should NOT appear in results.

### 🚨 MANDATORY: ALL SECTIONS REQUIRED
You MUST include ALL sections in your JSON response:
- overall_sentiment (with summary, workload, minority_opinions)
- difficulty (with rank, rating, explanation)  
- professors (array with name, rating, reviews)
- **advice** (with course_specific_tips, resources, minority_opinions) ← REQUIRED
- **common_pitfalls** (array of pitfall strings) ← REQUIRED

### CRITICAL JSON FORMATTING RULES
1. **VALID JSON ONLY**: Return ONLY valid JSON, no markdown, no explanations, no text outside the JSON object
2. **ESCAPE QUOTES**: Use \\" for quotes inside strings (e.g., "She said \\"hello\\"")
3. **NO NEWLINES IN STRINGS**: Replace actual newlines with \\n in strings
4. **NO TRAILING COMMAS**: Ensure no comma after the last item in objects/arrays
5. **PROPER NESTING**: Ensure all brackets and braces are properly closed
6. **COMPLETE RESPONSE**: Include ALL sections listed above - do not truncate

Return ONLY the JSON object, no other text.

### REDDIT DATA:
{formatted_reddit_data if formatted_reddit_data.strip() else "No Reddit discussions found."}

### UCR DATABASE DATA:
{ucr_database_data if ucr_database_data.strip() else "No UCR database entries found."}

### RATE MY PROFESSORS DATA:
{formatted_rmp_data if formatted_rmp_data.strip() else "No Rate My Professors data found."}"""

    def _create_professor_analysis_prompt(self, professor_name: str, course_filter: str, formatted_reddit_data: str, ucr_database_data: str = "", formatted_rmp_data: str = "") -> str:
        """Create professor-focused analysis prompt"""
        course_context = f" for course {course_filter}" if course_filter else " across all courses"
        
        # Ensure all data parameters are strings to avoid .strip() errors
        reddit_data_safe = str(formatted_reddit_data) if formatted_reddit_data else ""
        ucr_data_safe = str(ucr_database_data) if ucr_database_data else ""
        rmp_data_safe = str(formatted_rmp_data) if formatted_rmp_data else ""
        
        return f"""You are a professor analysis specialist that creates comprehensive professor profiles.

### Context
Professor: {professor_name}
Course Focus: {course_filter if course_filter else "All Courses"}
Reddit Data: {reddit_data_safe[:800] if reddit_data_safe.strip() else "No Reddit data"}...
UCR Database: {ucr_data_safe[:800] if ucr_data_safe.strip() else "No database data"}...
RMP Data: {rmp_data_safe[:800] if rmp_data_safe.strip() else "No RMP data"}...

### Task: Create Comprehensive Professor Profile
Analyze ALL available data about Professor {professor_name}{course_context} and create a detailed, honest profile.

### CRITICAL INSTRUCTIONS:
- **PRIMARY RATING**: Use RMP overall rating as the main rating when available
- **BE BRUTALLY HONEST**: Don't favor positive over negative reviews
- **RECENT PRIORITY**: Weight recent reviews more heavily
- **COMPREHENSIVE COVERAGE**: Include ALL review sources (RMP, Reddit, Sheets)
- **COURSE CONTEXT**: {f"Focus on {course_filter}-specific content" if course_filter else "Include all course contexts"}

### PROFESSOR ANALYSIS REQUIREMENTS:

1. **RATING CALCULATION**:
   - **Primary Rating**: Use RMP overall rating if available, otherwise calculate from all sources
   - **Calculate Sentiment Distribution**: Honest percentages of positive/neutral/negative
   - **Total Reviews**: Count ALL reviews from all sources

2. **REVIEW SELECTION** (BE HONEST):
   - Include 8-12 most representative reviews
   - **Prioritize recent reviews** (2020+ when possible)
   - **Reflect reality**: If mostly negative, show mostly negative
   - **MANDATORY SOURCE VARIETY**: MUST include reviews from ALL available sources:
     * If RMP data exists → Include RMP reviews
     * If Reddit data exists → Include Reddit post/comment reviews  
     * If UCR Database data exists → Include database reviews
     * DO NOT show only RMP reviews when other sources have data
   - **Course-specific**: {f"Only include {course_filter} reviews" if course_filter else "Include various courses taught"}

3. **TEACHING ANALYSIS**:
   - Teaching style and effectiveness
   - Grading patterns and fairness  
   - Student support and accessibility
   - Course difficulty and workload

### OUTPUT JSON FORMAT:
{{
    "professor_info": {{
        "name": "{professor_name}",
        "course_focus": "{course_filter if course_filter else 'All Courses'}",
        "primary_rating": 3.2,
        "rating_source": "rmp" or "calculated",
        "max_rating": 5,
        "department": "Computer Science",
        "rmp_link": "Extract from RMP data if available",
        "total_reviews_analyzed": 45,
        "sentiment_distribution": {{"positive": 40, "neutral": 20, "negative": 40}}
    }},
    "teaching_analysis": {{
        "teaching_style": "Description of teaching approach",
        "strengths": ["Strength 1", "Strength 2"],
        "weaknesses": ["Weakness 1", "Weakness 2"],
        "grading_style": "Description of grading approach",
        "student_support": "How helpful professor is outside class"
    }},
    "reviews": [
        {{
            "source": "rmp",
            "date": "2024-01-15",
            "course": "{course_filter if course_filter else 'BUS010'}",
            "rating": 2,
            "text": "RMP review text here",
            "tags": ["Tough Grader", "Unclear"]
        }},
        {{
            "source": "reddit", 
            "date": "2024-02-20",
            "course": "{course_filter if course_filter else 'BUS010'}",
            "rating": 4,
            "text": "Reddit post/comment text about professor here"
        }},
        {{
            "source": "database", 
            "date": "2024-03-10",
            "course": "{course_filter if course_filter else 'BUS010'}",
            "rating": 3,
            "text": "UCR database review text here"
        }}
    ],
    "course_breakdown": {{
        "courses_taught": ["CS111", "CS141"],
        "most_reviewed_course": "{course_filter if course_filter else 'CS111'}",
        "course_specific_notes": "Any course-specific observations"
    }},
    "student_advice": {{
        "tips_for_success": ["Tip 1", "Tip 2"],
        "what_to_expect": ["Expectation 1", "Expectation 2"],
        "who_should_take": "Type of student who would do well",
        "who_should_avoid": "Type of student who might struggle"
    }}
}}

**CRITICAL REMINDERS:**
- Use RMP rating as primary when available
- Be honest about review distribution
- Include negative reviews if they're prevalent
- **MUST INCLUDE ALL SOURCE TYPES**: If Reddit data exists, include Reddit reviews. If UCR database exists, include database reviews. DO NOT only show RMP reviews.
- Focus on helping students make informed decisions
- {f"Only analyze {course_filter} content" if course_filter else "Include all course contexts"}

### REDDIT POSTS AND COMMENTS:
{reddit_data_safe if reddit_data_safe.strip() else "No Reddit data available"}

### UCR DATABASE REVIEWS:
{ucr_data_safe if ucr_data_safe.strip() else "No database data available"}

### RATE MY PROFESSORS DATA:
{rmp_data_safe if rmp_data_safe.strip() else "No RMP data available"}

ANALYZE AND RETURN PROFESSOR PROFILE AS JSON:"""

# create a global instance
openai_service = AsyncOpenAIService() 
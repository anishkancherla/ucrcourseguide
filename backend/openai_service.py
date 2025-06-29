from openai import OpenAI
from typing import Dict, Any, List
from config import config
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        """setup openai client"""
        try:
            self.client = OpenAI(api_key=config.OPENAI_API_KEY)
            self.model = config.OPENAI_MODEL
            logger.info(f"OpenAI client initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            raise
    
    def analyze_course_discussions_structured(self, course_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        analyze ucr course discussions and return structured data for frontend
        """
        try:
            course = course_data.get("course", "Unknown Course")
            posts = course_data.get("posts", [])
            ucr_database = course_data.get("ucr_database", "")
            
            if not posts and not ucr_database:
                return {
                    "success": False,
                    "error": "No data to analyze"
                }
            
            logger.info(f"Analyzing {len(posts)} Reddit posts + UCR database for course: {course}")
            
            # format reddit data for ai
            formatted_reddit_data = self._format_posts_for_ai(posts) if posts else ""
            
            # create structured data prompt
            prompt = self._create_structured_analysis_prompt(course, formatted_reddit_data, ucr_database)
            
            # call openai api
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert UCR academic advisor who analyzes student discussions to provide structured course data."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=6000
            )
            
            # parse JSON response
            try:
                structured_data = json.loads(response.choices[0].message.content)
            except json.JSONDecodeError:
                # fallback to old method if JSON parsing fails
                return self.analyze_course_discussions(course_data)
            
            return {
                "success": True,
                "course": course,
                "structured_data": structured_data,
                "analysis_metadata": {
                    "total_posts_analyzed": len(posts),
                    "total_comments_analyzed": sum(len(post_data.get("comments", [])) for post_data in posts),
                    "ucr_database_included": bool(ucr_database),
                    "model_used": self.model,
                    "analysis_type": "structured_course_data"
                }
            }
            
        except Exception as e:
            logger.error(f"Structured analysis failed for course {course}: {e}")
            return {
                "success": False,
                "error": str(e),
                "course": course
            }

    def analyze_course_discussions(self, course_data: Dict[str, Any]) -> Dict[str, Any]:
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
            
            # call openai api
            response = self.client.chat.completions.create(
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
    
    def _create_structured_analysis_prompt(self, course: str, formatted_reddit_data: str, ucr_database_data: str = "") -> str:
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
        "explanation": ["Reason 1", "Reason 2", "Reason 3"],
        "minority_opinions": ["Any contrarian difficulty opinions"]
    }},
    "professors": [
        {{
            "name": "Professor Name",
            "rating": 4.2,
            "max_rating": 5,
            "reviews": [
                {{"source": "database", "date": "2024-01-15", "text": "Review text"}},
                {{"source": "reddit", "date": "2024-02-20", "text": "Review text"}}
            ],
            "minority_opinions": ["Any negative opinions about this prof"]
        }}
    ],
    "advice": {{
        "course_specific_tips": ["Tip 1", "Tip 2", "Tip 3"],
        "resources": ["Resource 1", "Resource 2"],
        "minority_opinions": ["Alternative study strategies"]
    }},
    "common_pitfalls": ["Pitfall 1", "Pitfall 2", "Pitfall 3"],
    "grade_distribution": "Description or 'No clear info'"
}}

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
6. ***Compute a 1–5-star rating for each professor***:  
   • 5 ★ = overwhelmingly positive; 1 ★ = overwhelmingly negative; 3 ★ = mixed.  
   • Base the rating on the ratio of positive to negative comments.  
7. Write output with the exact markdown headings below. If a section has no info, keep the heading and write "No clear info."

### Output format (markdown)

#### Overall Sentiment
One-sentence vibe (e.g., "Mostly positive but time-consuming").

**Workload & Time Commitment:** Include specific details about hours per week, number of projects/exams, key pain points, and how time-consuming the course is.

#### Difficulty
– Rank: *Easy / Moderate / Hard / Very Hard*  
– 2-4 bullet points explaining why.

#### Professors & What Students Say
| Professor | ★ Rating | Representative reviews<sup>†</sup> |
|-----------|---------|-------------------------------------|
| Name      | ★★★★☆   | 1. 📊 2024-11-15 – "Engaging lectures but tough quizzes."<br>2. 👽 2025-03-02 – "Clear grader, slides online." |

<sup>†</sup> Prefix each quote with **📊** if it came from the database or **👽** if from Reddit, and include the review date (YYYY-MM-DD).

#### Advice & Tips for Success
**COURSE-SPECIFIC ONLY:** List practical tips that are unique to this exact course/professors. Avoid generic advice like "study early," "stay organized," "attend lectures" - only include tips that are specific to this course's format, professors, exams, or unique requirements.

**Recommended Resources:** Include books, websites, videos, tutoring, and other helpful resources within this section.

#### Common Pitfalls
Top 3 mistakes students warn about.

#### Grade Distribution Perception
If discussed, summarise; else "No clear info."

### Style rules
- Plain English.  
- Bullets ≤ 20 words.  
- **Include positive and negative viewpoints.**  
- Each professor needs **at least two quotes** (one positive, one negative if available).  
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

# create a global instance
openai_service = OpenAIService() 
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
                max_tokens=2000   # long summary
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
2. **Prioritise newer items** in each set: higher `created_utc` for Reddit, later `date` for database.  
3. When recency is similar, use up-votes (Reddit) or `individual_difficulty` extremes (database) to decide influence.  
4. Ignore off-topic chatter, memes, or duplicates.  
5. Capture both majority and strong minority views.  
6. Write output with the exact markdown headings below. If a section has no info, keep the heading and write "No clear info."

### Output format (markdown)

#### Overall Sentiment
One-sentence vibe (e.g., "Mostly positive but time-consuming").

#### Difficulty
– Rank: *Easy / Moderate / Hard / Very Hard*  
– 2-4 bullet points explaining why.

#### Workload & Time Commitment
Bullets on hours per week, number of projects/exams, key pain points.

#### Popular Professors & What Students Say
| Professor | Reputation | Key quotes |
|-----------|------------|------------|
| Name      | e.g. "fun but tough grader" | "Exact student quote" |

#### Key Concepts / Topics Covered
Comma-separated list of most mentioned topics.

#### Advice & Tips for Success
Numbered list of practical tips.

#### Recommended Resources
Books, websites, videos, tutoring, etc.

#### Common Pitfalls
Top 3 mistakes students warn about.

#### Grade Distribution Perception
If discussed, summarise; else "No clear info."

#### Notable Minority Opinions
One-sentence summaries of strong outlier takes.

---

### UCR Database Review Summary
Provide a **separate** digest of the Google Sheets reviews:  
* Overall average difficulty (0-10).  
* Difficulty range.  
* Include bullet trends (e.g., "Group paper is 50 % of grade").  
* Professor highlights if mentioned.  
* Any clear advice or warnings.

### Style rules
- Plain English.  
- Bullets ≤ 20 words.  
- No invented facts; if unsure, write "Not mentioned."  
- Do **not** mention Reddit, up-votes, JSON, or yourself.  
- **Maximum 800 words** total.

Return only the markdown above.

### REDDIT DATA:
{formatted_reddit_data if formatted_reddit_data.strip() else "No Reddit discussions found for this course."}

### UCR DATABASE DATA:
{ucr_database_data if ucr_database_data.strip() else "No UCR database entries found for this course."}"""

# create a global instance
openai_service = OpenAIService() 
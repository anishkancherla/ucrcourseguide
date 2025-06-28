import praw
from typing import List, Dict, Any
from config import config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RedditService:
    def __init__(self):
        """setup reddit connection (read-only)"""
        try:
            self.reddit = praw.Reddit(
                client_id=config.REDDIT_CLIENT_ID,
                client_secret=config.REDDIT_CLIENT_SECRET,
                user_agent=config.REDDIT_USER_AGENT
            )
            # make sure it works
            logger.info(f"Reddit instance created. Read-only: {self.reddit.read_only}")
        except Exception as e:
            logger.error(f"Failed to initialize Reddit instance: {e}")
            raise
    
    def search_course_info(self, keyword: str, limit: int = 50) -> Dict[str, Any]:
        """
        search for posts about a course in r/ucr
        """
        try:
            results = {
                "keyword": keyword,
                "subreddits": {},
                "total_posts": 0
            }
            
            # we mainly care about r/ucr
            target_subreddits = ["ucr"]
            
            for subreddit_name in target_subreddits:
                logger.info(f"Searching r/{subreddit_name} for: {keyword}")
                subreddit_posts = self._search_subreddit(subreddit_name, keyword, limit)
                results["subreddits"][subreddit_name] = subreddit_posts
                results["total_posts"] += len(subreddit_posts["posts"])
            
            logger.info(f"Search completed. Total posts found: {results['total_posts']}")
            return results
            
        except Exception as e:
            logger.error(f"Error searching for item flaws: {e}")
            raise
    
    def _search_subreddit(self, subreddit_name: str, keyword: str, limit: int) -> Dict[str, Any]:
        """
        search a specific subreddit for mentions of the keyword
        """
        try:
            subreddit = self.reddit.subreddit(subreddit_name)
            
            # search the subreddit
            search_results = subreddit.search(keyword, sort="relevance", time_filter="all", limit=limit)
            
            posts = []
            for submission in search_results:
                try:
                    # get basic info from each post
                    post_data = {
                        "id": submission.id,
                        "title": submission.title,
                        "score": submission.score,
                        "upvote_ratio": submission.upvote_ratio,
                        "num_comments": submission.num_comments,
                        "created_utc": submission.created_utc,
                        "author": str(submission.author) if submission.author else "[deleted]",
                        "url": f"https://reddit.com{submission.permalink}",
                        "selftext": submission.selftext[:500] if submission.selftext else "",  # limit text length
                        "is_self": submission.is_self,
                        "link_flair_text": submission.link_flair_text,
                        "subreddit": str(submission.subreddit)
                    }
                    posts.append(post_data)
                except Exception as e:
                    logger.warning(f"Error processing post {submission.id}: {e}")
                    continue
            
            return {
                "subreddit_name": subreddit_name,
                "posts_count": len(posts),
                "posts": posts
            }
            
        except Exception as e:
            logger.error(f"Error searching r/{subreddit_name}: {e}")
            return {
                "subreddit_name": subreddit_name,
                "posts_count": 0,
                "posts": [],
                "error": str(e)
            }
    
    def get_post_comments(self, post_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        get comments from a specific post
        """
        try:
            submission = self.reddit.submission(id=post_id)
            submission.comments.replace_more(limit=0)  # remove "more comments" objects
            
            comments = []
            for comment in submission.comments.list()[:limit]:
                try:
                    if hasattr(comment, 'body') and comment.body not in ['[deleted]', '[removed]']:
                        comment_data = {
                            "id": comment.id,
                            "body": comment.body[:300],  # limit comment length
                            "score": comment.score,
                            "created_utc": comment.created_utc,
                            "author": str(comment.author) if comment.author else "[deleted]"
                        }
                        comments.append(comment_data)
                except Exception as e:
                    logger.warning(f"Error processing comment: {e}")
                    continue
            
            return comments
            
        except Exception as e:
            logger.error(f"Error getting comments for post {post_id}: {e}")
            return []
    
    def get_full_post_content_for_ai(self, post_id: str, max_comments: int = 50) -> Dict[str, Any]:
        """
        get full post content and comments for ai analysis (no text limits)
        """
        try:
            submission = self.reddit.submission(id=post_id)
            submission.comments.replace_more(limit=0)
            
            # get full post content (no truncation for ai)
            post_content = {
                "id": submission.id,
                "title": submission.title,
                "selftext": submission.selftext,  # full text, no limits
                "score": submission.score,
                "upvote_ratio": submission.upvote_ratio,
                "num_comments": submission.num_comments,
                "created_utc": submission.created_utc,
                "author": str(submission.author) if submission.author else "[deleted]",
                "url": f"https://reddit.com{submission.permalink}",
                "subreddit": str(submission.subreddit),
                "link_flair_text": submission.link_flair_text
            }
            
            # get full comments (no truncation for ai)
            comments = []
            for comment in submission.comments.list()[:max_comments]:
                try:
                    if hasattr(comment, 'body') and comment.body not in ['[deleted]', '[removed]']:
                        comment_data = {
                            "id": comment.id,
                            "body": comment.body,  # full comment, no limits
                            "score": comment.score,
                            "created_utc": comment.created_utc,
                            "author": str(comment.author) if comment.author else "[deleted]"
                        }
                        comments.append(comment_data)
                except Exception as e:
                    logger.warning(f"Error processing comment: {e}")
                    continue
            
            return {
                "success": True,
                "post": post_content,
                "comments": comments,
                "comments_count": len(comments)
            }
            
        except Exception as e:
            logger.error(f"Error getting full content for post {post_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "post": None,
                "comments": []
            }
    
    def get_multiple_posts_for_ai(self, post_ids: List[str], max_comments_per_post: int = 30) -> Dict[str, Any]:
        """
        get full content from multiple posts for ai analysis
        """
        try:
            logger.info(f"Getting full content for {len(post_ids)} posts with max {max_comments_per_post} comments each")
            
            posts_data = []
            
            for post_id in post_ids:
                try:
                    full_post_data = self.get_full_post_content_for_ai(post_id, max_comments_per_post)
                    
                    if full_post_data["success"]:
                        posts_data.append({
                            "post": full_post_data["post"],
                            "comments": full_post_data["comments"]
                        })
                    else:
                        logger.warning(f"Failed to get content for post {post_id}: {full_post_data.get('error', 'Unknown error')}")
                        
                except Exception as e:
                    logger.warning(f"Error processing post {post_id}: {e}")
                    continue
            
            return {
                "success": True,
                "posts_processed": len(posts_data),
                "data": posts_data
            }
            
        except Exception as e:
            logger.error(f"Error getting multiple posts: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": []
            }

# create a global instance
reddit_service = RedditService() 
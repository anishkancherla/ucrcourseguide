import requests
import csv
import io
from typing import List, Dict, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ClassReview:
    """basic class review data from the google sheets"""
    class_code: str
    average_difficulty: Optional[float]
    additional_comments: str
    difficulty: Optional[int]
    date: str

class SheetsService:
    """service for fetching data from ucr class difficulty google sheets"""
    
    UCR_DATABASE_URL = "https://docs.google.com/spreadsheets/d/1qiy_Oi8aFiPmL4QSTR3zHe74kmvc6e_159L1mAUUlU0/export?format=csv&gid=0"
    
    def __init__(self):
        self.cache = {}
        self.cache_timeout = 3600  # 1 hour cache
    
    def fetch_ucr_class_data(self) -> List[ClassReview]:
        """
        fetch all ucr class difficulty data from google sheets
        handles the grouped structure where class names in column a group multiple reviews
        """
        try:
            logger.info("Fetching UCR class data from Google Sheets")
            
            # get csv data
            response = requests.get(self.UCR_DATABASE_URL, timeout=30)
            response.raise_for_status()
            
            # parse csv
            csv_data = io.StringIO(response.text)
            reader = csv.reader(csv_data)
            
            reviews = []
            current_class = None
            current_avg_difficulty = None
            
            # skip header row
            next(reader, None)  # skip "Class, Average Difficulty, Additional Comments, etc."
            
            for row_num, row in enumerate(reader, start=2):
                if len(row) < 3:  # need at least 3 columns
                    continue
                    
                try:
                    # column a: class code
                    class_code = row[0].strip().upper() if row[0].strip() else None
                    
                    # column b: average difficulty (only when new class starts)
                    avg_difficulty_str = row[1].strip() if len(row) > 1 else ""
                    
                    # column c: comments/reviews
                    comments = row[2].strip() if len(row) > 2 else ""
                    
                    # column d: individual difficulty rating
                    individual_difficulty = None
                    if len(row) > 3 and row[3].strip():
                        try:
                            individual_difficulty = int(float(row[3].strip()))
                        except ValueError:
                            pass
                    
                    # column e: date
                    date = row[4].strip() if len(row) > 4 else ""
                    
                    # check if this row starts a new class
                    if class_code:
                        current_class = class_code
                        # parse average difficulty for this class
                        current_avg_difficulty = None
                        if avg_difficulty_str:
                            try:
                                current_avg_difficulty = float(avg_difficulty_str)
                            except ValueError:
                                pass
                    
                    # only process rows that have either a class code or belong to current class
                    if current_class and comments:
                        review = ClassReview(
                            class_code=current_class,
                            average_difficulty=current_avg_difficulty,
                            additional_comments=comments,
                            difficulty=individual_difficulty,
                            date=date
                        )
                        reviews.append(review)
                        
                except Exception as e:
                    logger.warning(f"Error parsing row {row_num} {row}: {e}")
                    continue
            
            logger.info(f"Successfully fetched {len(reviews)} class reviews from UCR database")
            return reviews
            
        except requests.RequestException as e:
            logger.error(f"Error fetching UCR class data: {e}")
            return []
        except Exception as e:
            logger.error(f"Error parsing UCR class data: {e}")
            return []
    
    def get_available_classes(self) -> List[str]:
        """
        get list of all class codes in column a
        """
        try:
            response = requests.get(self.UCR_DATABASE_URL, timeout=30)
            response.raise_for_status()
            
            csv_data = io.StringIO(response.text)
            reader = csv.reader(csv_data)
            
            # skip header
            next(reader, None)
            
            available_classes = []
            for row in reader:
                if len(row) > 0 and row[0].strip():
                    class_code = row[0].strip().upper()
                    if class_code not in available_classes:
                        available_classes.append(class_code)
            
            return available_classes
            
        except Exception as e:
            logger.error(f"Error getting available classes: {e}")
            return []
    
    def get_class_reviews(self, class_code: str) -> List[ClassReview]:
        """
        get all reviews for a specific class
        first checks if class exists in column a, then parses reviews
        """
        class_code_upper = class_code.upper().strip()
        
        # check if this class exists in column a
        available_classes = self.get_available_classes()
        
        if class_code_upper not in available_classes:
            logger.info(f"Class {class_code_upper} not found in UCR database. Available classes: {available_classes[:10]}...")
            return []
        
        # class exists, so get all reviews and filter for this class
        all_reviews = self.fetch_ucr_class_data()
        
        # find all reviews that match the class code
        matching_reviews = [
            review for review in all_reviews 
            if review.class_code == class_code_upper
        ]
        
        logger.info(f"Found {len(matching_reviews)} reviews for {class_code_upper}")
        return matching_reviews
    
    def get_class_summary(self, class_code: str) -> Dict:
        """
        get a summary of class data including avg difficulty and recent comments
        """
        reviews = self.get_class_reviews(class_code)
        
        if not reviews:
            return {
                "class_code": class_code.upper(),
                "found": False,
                "message": "No data found in UCR database"
            }
        
        # calculate averages
        difficulties = [r.difficulty for r in reviews if r.difficulty is not None]
        avg_difficulties = [r.average_difficulty for r in reviews if r.average_difficulty is not None]
        
        avg_difficulty = sum(difficulties) / len(difficulties) if difficulties else None
        overall_avg_difficulty = avg_difficulties[0] if avg_difficulties else None
        
        # get recent comments (increased limit for more comprehensive analysis)
        recent_reviews = sorted(reviews, key=lambda x: x.date, reverse=True)[:20]
        
        return {
            "class_code": class_code.upper(),
            "found": True,
            "total_reviews": len(reviews),
            "average_difficulty": avg_difficulty,
            "overall_average_difficulty": overall_avg_difficulty,
            "recent_comments": [r.additional_comments for r in recent_reviews if r.additional_comments],
            "difficulty_range": {
                "min": min(difficulties) if difficulties else None,
                "max": max(difficulties) if difficulties else None
            }
        }
    
    def format_for_ai_analysis(self, class_code: str) -> str:
        """
        format class data specifically for ai analysis
        """
        reviews = self.get_class_reviews(class_code)
        
        if not reviews:
            return ""
        
        # format for ai
        formatted_data = f"UCR Class Difficulty Database - {class_code.upper()}\n\n"
        
        # add overall average if available
        avg_difficulties = [r.average_difficulty for r in reviews if r.average_difficulty is not None]
        if avg_difficulties:
            formatted_data += f"Overall Average Difficulty: {avg_difficulties[0]}/10\n\n"
        
        # add individual reviews
        formatted_data += "Individual Reviews:\n"
        for i, review in enumerate(reviews, 1):
            formatted_data += f"Review {i}:\n"
            if review.date:
                formatted_data += f"Date: {review.date}\n"
            if review.difficulty is not None:
                formatted_data += f"Individual Difficulty: {review.difficulty}/10\n"
            if review.additional_comments:
                formatted_data += f"Comments: {review.additional_comments}\n"
            formatted_data += "\n"
        
        return formatted_data
    
    def get_reviews_for_professor_analysis(self, course_filter: str = "") -> List[ClassReview]:
        """
        🎯 PROFESSOR-FOCUSED ANALYSIS: Get reviews for AI professor filtering
        
        With course_filter: Get all reviews for that specific course
        Without course_filter: Get reviews from popular courses for efficiency
        """
        try:
            all_reviews = self.fetch_ucr_class_data()
            
            if course_filter:
                # Filter reviews for specific course
                course_upper = course_filter.upper()
                filtered_reviews = [r for r in all_reviews if r.class_code.upper() == course_upper]
                logger.info(f"📚 Found {len(filtered_reviews)} reviews for course {course_upper}")
                return filtered_reviews
            else:
                # Get reviews from popular course prefixes for efficiency
                popular_prefixes = ['CS', 'MATH', 'PSYC', 'BIOL', 'CHEM', 'PHYS', 'ENGL', 'HIST', 'ECON', 'STAT']
                filtered_reviews = []
                
                for review in all_reviews:
                    course_prefix = ''.join([c for c in review.class_code if c.isalpha()]).upper()
                    if course_prefix in popular_prefixes:
                        filtered_reviews.append(review)
                
                logger.info(f"📚 Found {len(filtered_reviews)} reviews from popular courses for professor analysis")
                return filtered_reviews
                
        except Exception as e:
            logger.error(f"Failed to get reviews for professor analysis: {e}")
            return []
    
    def format_reviews_for_professor_ai(self, reviews: List[ClassReview], professor_name: str, course_filter: str = "") -> str:
        """
        🎯 FORMAT REVIEWS for AI to find professor mentions
        """
        if not reviews:
            return ""
        
        context = f"with course filter {course_filter}" if course_filter else "across all courses"
        formatted_data = f"UCR Class Reviews for Professor Analysis ({professor_name} {context})\n\n"
        
        # Group by course for better organization
        by_course = {}
        for review in reviews:
            course = review.class_code.upper()
            if course not in by_course:
                by_course[course] = []
            by_course[course].append(review)
        
        # Format each course's reviews
        for course, course_reviews in by_course.items():
            formatted_data += f"=== {course} ===\n"
            
            for i, review in enumerate(course_reviews, 1):
                formatted_data += f"Review {i}:\n"
                if review.date:
                    formatted_data += f"Date: {review.date}\n"
                if review.difficulty is not None:
                    formatted_data += f"Difficulty: {review.difficulty}/10\n"
                if review.additional_comments:
                    formatted_data += f"Comments: {review.additional_comments}\n"
                formatted_data += "\n"
            
            formatted_data += "---\n\n"
        
        return formatted_data 
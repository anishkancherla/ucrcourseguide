"""
Rate My Professor Service
------------------------
Comprehensive RateMyProfessors GraphQL API implementation.
Based on working Rust implementation with full review and course filtering capabilities.

Provides methods to:
- Search schools by name
- Search professors within a school
- Get professor details and ratings
- Get actual student reviews/comments
- Filter reviews by specific courses
- Get complete professor lists for schools
"""

import httpx
import asyncio
import json
from typing import Dict, Any, List, Optional
import logging
from config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RateMyProfessorService:
    def __init__(self):
        """Initialize the RMP service"""
        self.api_url = "https://www.ratemyprofessors.com/graphql"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "Authorization": "Basic dGVzdDp0ZXN0",
            "Sec-GPC": "1",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Priority": "u=4",
        }
        
        # GraphQL query for getting professor reviews/comments
        self.TEACHER_COMMENTS_QUERY = '''
        query TeacherRatingsPageQuery($id: ID!) {
            node(id: $id) {
                __typename
                ... on Teacher {
                    firstName
                    lastName
                    department
                    ratings(first: 1000) {
                        edges {
                            node {
                                comment
                                class
                                date
                                helpfulRating
                                difficultyRating
                                grade
                                wouldTakeAgain
                                ratingTags
                                clarityRating
                            }
                        }
                    }
                }
            }
        }
        '''
        
        # GraphQL query for getting professor ID (simplified)
        self.GET_TEACHER_ID_QUERY = '''
        query TeacherSearchResultsPageQuery(
            $query: TeacherSearchQuery!
            $schoolID: ID
            $includeSchoolFilter: Boolean!
        ) {
            search: newSearch {
                teachers(query: $query, first: 1) {
                    edges {
                        node {
                            id
                            firstName
                            lastName
                        }
                    }
                }
            }
            school: node(id: $schoolID) @include(if: $includeSchoolFilter) {
                __typename
                ... on School {
                    name
                }
                id
            }
        }
        '''
        
        # GraphQL query for getting all professors at a school
        self.TEACHER_LIST_QUERY = '''
        query TeacherSearchResultsPageQuery(
            $query: TeacherSearchQuery!
            $schoolID: ID
            $includeSchoolFilter: Boolean!
        ) {
            search: newSearch {
                teachers(query: $query, first: 1000, after: "") {
                    edges {
                        node {
                            id
                            legacyId
                            firstName
                            lastName
                            department
                            avgRating
                            numRatings
                            wouldTakeAgainPercent
                            avgDifficulty
                            school {
                                name
                                id
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                    resultCount
                }
            }
            school: node(id: $schoolID) @include(if: $includeSchoolFilter) {
                __typename
                ... on School {
                    name
                }
                id
            }
        }
        '''

        # Enhanced teacher search query (same as before but keeping for reference)
        self.TEACHER_QUERY = '''query TeacherSearchResultsPageQuery(
  $query: TeacherSearchQuery!
  $schoolID: ID
  $includeSchoolFilter: Boolean!
) {
  search: newSearch {
    teachers(query: $query, first: 8, after: "") {
      didFallback
      edges {
        cursor
        node {
          id
          legacyId
          avgRating
          numRatings
          wouldTakeAgainPercent
          avgDifficulty
          department
          firstName
          lastName
          school {
            name
            id
          }
          isSaved
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      resultCount
    }
  }
  school: node(id: $schoolID) @include(if: $includeSchoolFilter) {
    __typename
    ... on School {
      name
    }
    id
  }
}'''

        self.SCHOOL_QUERY = '''query NewSearchSchoolsQuery(
  $query: SchoolSearchQuery!
) {
  newSearch {
    schools(query: $query) {
      edges {
        cursor
        node {
          id
          legacyId
          name
          city
          state
          departments {
            id
            name
          }
          numRatings
          avgRatingRounded
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}'''

        # GraphQL query for getting professor courses without full reviews
        self.GET_PROFESSOR_COURSES_QUERY = '''
        query TeacherRatingsPageQuery($id: ID!) {
            node(id: $id) {
                __typename
                ... on Teacher {
                    firstName
                    lastName
                    department
                    ratings(first: 1000) {
                        edges {
                            node {
                                class
                            }
                        }
                    }
                }
            }
        }
        '''
        
        logger.info("RateMyProfessorService initialized with comprehensive GraphQL queries")
    
    async def _gql_request(self, query: str, variables: dict) -> Dict[str, Any]:
        """Send GraphQL request with proper formatting"""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    self.api_url,
                    json={"query": query, "variables": variables},
                    headers=self.headers
                )
                response.raise_for_status()
                
                data = response.json()
                if "errors" in data:
                    logger.error(f"GraphQL errors: {data['errors']}")
                    raise Exception(f"GraphQL errors: {data['errors']}")
                
                return data["data"]
                
        except Exception as e:
            logger.error(f"GraphQL request failed: {e}")
            raise
    
    async def search_schools(self, query: str) -> List[Dict[str, Any]]:
        """Search schools by name using GraphQL"""
        try:
            logger.info(f"Searching schools for: {query}")
            
            variables = {
                "query": {
                    "text": query
                }
            }
            
            data = await self._gql_request(self.SCHOOL_QUERY, variables)
            schools = []
            
            for edge in data["newSearch"]["schools"]["edges"]:
                node = edge["node"]
                school = {
                    "id": node["id"],
                    "legacyId": node["legacyId"],
                    "name": node["name"],
                    "city": node["city"],
                    "state": node["state"],
                    "numRatings": node["numRatings"],
                    "avgRatingRounded": node["avgRatingRounded"],
                    "departments": node["departments"]
                }
                schools.append(school)
            
            logger.info(f"Found {len(schools)} schools")
            return schools
            
        except Exception as e:
            logger.error(f"Failed to search schools: {e}")
            return []
    
    async def search_professors(self, school_id: str, query: str) -> List[Dict[str, Any]]:
        """Search professors within a specific school using GraphQL"""
        try:
            logger.info(f"Searching professors in school {school_id} for: {query}")
            
            variables = {
                "query": {
                    "text": query,
                    "schoolID": school_id,
                    "fallback": True,
                    "departmentID": None
                },
                "schoolID": school_id,
                "includeSchoolFilter": True
            }
            
            data = await self._gql_request(self.TEACHER_QUERY, variables)
            professors = []
            
            for edge in data["search"]["teachers"]["edges"]:
                node = edge["node"]
                professor = {
                    "id": node["id"],
                    "legacyId": node["legacyId"],
                    "firstName": node["firstName"],
                    "lastName": node["lastName"],
                    "department": node["department"],
                    "avgRating": node["avgRating"],
                    "avgDifficulty": node["avgDifficulty"],
                    "numRatings": node["numRatings"],
                    "wouldTakeAgainPercent": node["wouldTakeAgainPercent"],
                    "school": {
                        "id": node["school"]["id"],
                        "name": node["school"]["name"]
                    },
                    "isSaved": node["isSaved"]
                }
                professors.append(professor)
            
            logger.info(f"Found {len(professors)} professors")
            return professors
            
        except Exception as e:
            logger.error(f"Failed to search professors: {e}")
            return []
    
    async def get_all_professors_at_school(self, school_id: str) -> List[Dict[str, Any]]:
        """Get complete list of all professors at a school"""
        try:
            logger.info(f"Getting all professors at school {school_id}")
            
            variables = {
                "query": {
                    "text": "",  # Empty string gets all professors
                    "schoolID": school_id,
                    "fallback": True,
                    "departmentID": None
                },
                "schoolID": school_id,
                "includeSchoolFilter": True
            }
            
            data = await self._gql_request(self.TEACHER_LIST_QUERY, variables)
            professors = []
            
            for edge in data["search"]["teachers"]["edges"]:
                node = edge["node"]
                professor = {
                    "id": node["id"],
                    "legacyId": node["legacyId"],
                    "firstName": node["firstName"],
                    "lastName": node["lastName"],
                    "department": node["department"],
                    "avgRating": node["avgRating"],
                    "avgDifficulty": node["avgDifficulty"],
                    "numRatings": node["numRatings"],
                    "wouldTakeAgainPercent": node["wouldTakeAgainPercent"],
                    "school": {
                        "id": node["school"]["id"],
                        "name": node["school"]["name"]
                    }
                }
                professors.append(professor)
            
            logger.info(f"Found {len(professors)} total professors")
            return professors
            
        except Exception as e:
            logger.error(f"Failed to get all professors: {e}")
            return []
    
    async def get_professor_id(self, professor_name: str, school_id: str) -> Optional[str]:
        """Get professor ID given name and school"""
        try:
            logger.info(f"Getting professor ID for {professor_name} at school {school_id}")
            
            variables = {
                "query": {
                    "text": professor_name,
                    "schoolID": school_id,
                    "fallback": True,
                    "departmentID": None
                },
                "schoolID": school_id,
                "includeSchoolFilter": True
            }
            
            data = await self._gql_request(self.GET_TEACHER_ID_QUERY, variables)
            
            edges = data["search"]["teachers"]["edges"]
            if edges:
                professor_id = edges[0]["node"]["id"]
                logger.info(f"Found professor ID: {professor_id}")
                return professor_id
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get professor ID: {e}")
            return None
    
    async def get_professor_comments(self, professor_id: str) -> List[Dict[str, Any]]:
        """Get all reviews/comments for a specific professor"""
        try:
            logger.info(f"Getting comments for professor {professor_id}")
            
            variables = {"id": professor_id}
            data = await self._gql_request(self.TEACHER_COMMENTS_QUERY, variables)
            
            comments = []
            ratings_edges = data["node"]["ratings"]["edges"]
            
            for edge in ratings_edges:
                node = edge["node"]
                comment = {
                    "comment": node.get("comment", ""),
                    "class": node.get("class", ""),
                    "date": node.get("date", ""),
                    "helpfulRating": node.get("helpfulRating"),
                    "difficultyRating": node.get("difficultyRating"),
                    "clarityRating": node.get("clarityRating", 0),
                    "helpfulnessRating": node.get("helpfulRating", 0),
                    "grade": node.get("grade", ""),
                    "wouldTakeAgain": node.get("wouldTakeAgain"),
                    "ratingTags": node.get("ratingTags", "")
                }
                comments.append(comment)
            
            logger.info(f"Retrieved {len(comments)} comments")
            return comments
            
        except Exception as e:
            logger.error(f"Failed to get professor comments: {e}")
            return []
    
    async def get_professor_summary(self, prof_id: str) -> Optional[Dict[str, Any]]:
        """Get summary stats for a professor"""
        try:
            logger.info(f"Getting professor summary for: {prof_id}")
            
            # Use the comments query to get professor info
            variables = {"id": prof_id}
            data = await self._gql_request(self.TEACHER_COMMENTS_QUERY, variables)
            
            if data and data.get("node"):
                node = data["node"]
                return {
                    "id": prof_id,
                    "firstName": node.get("firstName"),
                    "lastName": node.get("lastName"),
                    "department": node.get("department"),
                    "formattedName": f"{node.get('firstName', '')} {node.get('lastName', '')}".strip()
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get professor summary: {e}")
            return None
    
    async def get_professor_ratings(self, prof_id: str, limit: int = 50, cursor: Optional[str] = None) -> Dict[str, Any]:
        """Get paginated list of a professor's ratings"""
        try:
            logger.info(f"Getting ratings for professor {prof_id}")
            
            # Use the comments query which gives us all ratings
            comments = await self.get_professor_comments(prof_id)
            
            # Convert comments to ratings format and apply limit
            ratings = []
            for comment in comments[:limit]:
                rating = {
                    "id": f"rating_{len(ratings)}",
                    "class": comment["class"],
                    "rating": comment["clarityRating"],
                    "difficulty": comment["difficultyRating"],
                    "comment": comment["comment"],
                    "date": comment["date"],
                    "grade": comment["grade"],
                    "wouldTakeAgain": comment["wouldTakeAgain"],
                    "ratingTags": comment["ratingTags"]
                }
                ratings.append(rating)
            
            return {
                "ratings": ratings,
                "pageInfo": {
                    "hasNextPage": len(comments) > limit,
                    "endCursor": None
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get professor ratings: {e}")
            return {"ratings": [], "pageInfo": {"hasNextPage": False, "endCursor": None}}
    
    async def get_ratings_by_course(self, prof_id: str, course: str, limit: int = 50, cursor: Optional[str] = None) -> Dict[str, Any]:
        """Get ratings filtered by course name or number"""
        try:
            logger.info(f"Getting course ratings for professor {prof_id}, course: {course}")
            
            # Get all comments and filter by course
            all_comments = await self.get_professor_comments(prof_id)
            
            # Filter by course
            course_lower = course.lower()
            filtered_comments = []
            
            for comment in all_comments:
                comment_class = comment.get("class", "").lower()
                if course_lower in comment_class:
                    filtered_comments.append(comment)
                    if len(filtered_comments) >= limit:
                        break
            
            # Convert to ratings format
            ratings = []
            for comment in filtered_comments:
                rating = {
                    "id": f"rating_{len(ratings)}",
                    "class": comment["class"],
                    "rating": comment["clarityRating"],
                    "difficulty": comment["difficultyRating"],
                    "comment": comment["comment"],
                    "date": comment["date"],
                    "grade": comment["grade"],
                    "wouldTakeAgain": comment["wouldTakeAgain"],
                    "ratingTags": comment["ratingTags"]
                }
                ratings.append(rating)
            
            logger.info(f"Retrieved {len(ratings)} course-specific ratings")
            return {
                "ratings": ratings,
                "pageInfo": {
                    "hasNextPage": False,
                    "endCursor": None
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get course ratings: {e}")
            return {"ratings": [], "pageInfo": {"hasNextPage": False, "endCursor": None}}
    
    async def get_professor_course_titles(self, prof_id: str) -> List[str]:
        """
        🎯 EXTRACT ACTUAL COURSE TITLES from RMP reviews
        Gets the exact course names from review titles (e.g., "PSYC001", "CS111")
        """
        try:
            # Get all comments/reviews for this professor
            all_comments = await self.get_professor_comments(prof_id)
            
            course_titles = set()
            for comment in all_comments:
                course_title = comment.get("class", "").strip()
                if course_title:
                    # Clean up the course title
                    course_clean = course_title.upper().strip()
                    if course_clean and len(course_clean) > 2:  # Valid course codes
                        course_titles.add(course_clean)
            
            course_list = sorted(list(course_titles))
            return course_list
            
        except Exception as e:
            logger.error(f"Failed to get course titles: {e}")
            return []

    async def validate_professor_course_exact(self, prof_id: str, course_code: str) -> Dict[str, Any]:
        """
        🎯 EXACT COURSE VALIDATION using actual RMP review course titles
        This checks against the real course titles from student reviews
        """
        try:
            # Get all actual course titles from reviews
            course_titles = await self.get_professor_course_titles(prof_id)
            
            if not course_titles:
                return {
                    "found": False,
                    "reason": "no_reviews_found",
                    "available_courses": [],
                    "message": "No reviews found for this professor"
                }
            
            course_upper = course_code.upper().strip()
            
            # Check for EXACT match in course titles
            if course_upper in course_titles:
                return {
                    "found": True,
                    "reason": "exact_match",
                    "matched_course": course_upper,
                    "available_courses": course_titles
                }
            
            # No exact match found
            return {
                "found": False,
                "reason": "course_not_reviewed",
                "searched_course": course_upper,
                "available_courses": course_titles,
                "message": f"No reviews found for {course_upper}. This professor has reviews for other courses."
            }
            
        except Exception as e:
            logger.error(f"Course validation failed: {e}")
            return {
                "found": False,
                "reason": "validation_error",
                "available_courses": [],
                "message": "Error checking course reviews"
            }

    async def professor_teaches_course(self, prof_id: str, course_code: str) -> bool:
        """Fast validation: Check if professor teaches a specific course"""
        try:
            logger.info(f"Checking if professor {prof_id} teaches {course_code}")
            
            # Get all courses this professor teaches
            courses = await self.get_professor_courses_fast(prof_id)
            
            # Check if the target course matches any taught course
            course_lower = course_code.lower()
            for taught_course in courses:
                if course_lower in taught_course.lower() or taught_course.lower() in course_lower:
                    logger.info(f"✅ Professor teaches {course_code} (found: {taught_course})")
                    return True
            
            logger.info(f"❌ Professor does not teach {course_code}")
            return False
            
        except Exception as e:
            logger.error(f"Failed to check if professor teaches course: {e}")
            return False

    async def get_professor_courses_fast(self, prof_id: str) -> List[str]:
        """Fast method to get just course names without full review data"""
        try:
            logger.info(f"Getting courses (fast) for professor {prof_id}")
            
            variables = {"id": prof_id}
            data = await self._gql_request(self.GET_PROFESSOR_COURSES_QUERY, variables)
            
            course_set = set()
            ratings_edges = data["node"]["ratings"]["edges"]
            
            for edge in ratings_edges:
                node = edge["node"]
                course = node.get("class")
                if course and course.strip():
                    course_set.add(course.strip())
            
            courses = list(course_set)
            logger.info(f"Found {len(courses)} distinct courses (fast)")
            return courses
            
        except Exception as e:
            logger.error(f"Failed to get professor courses (fast): {e}")
            return []

    async def get_professor_courses(self, prof_id: str, sample: int = 300) -> List[Dict[str, Any]]:
        """Get a deduplicated list of course codes with counts for a professor"""
        try:
            logger.info(f"Getting courses for professor {prof_id}")
            
            comments = await self.get_professor_comments(prof_id)
            
            course_counts = {}
            for comment in comments:
                course = comment.get("class")
                if course and course.strip():
                    course_counts[course] = course_counts.get(course, 0) + 1
            
            courses = [{"course": course, "count": count} for course, count in course_counts.items()]
            courses.sort(key=lambda x: x["count"], reverse=True)
            
            logger.info(f"Found {len(courses)} distinct courses")
            return courses
            
        except Exception as e:
            logger.error(f"Failed to get professor courses: {e}")
            return []
    
    async def search_professors_for_course(self, school_name: str, professor_names: List[str]) -> Dict[str, Any]:
        """
        Search for multiple professors at a school and return their RMP data
        This is the main method for the UCR course guide integration
        """
        try:
            logger.info(f"Searching RMP data for professors at {school_name}: {professor_names}")
            
            # First, find the school
            schools = await self.search_schools(school_name)
            if not schools:
                logger.warning(f"No schools found for: {school_name}")
                return {"school_found": False, "professors": []}
            
            # Use the first matching school
            school = schools[0]
            school_id = school["id"]
            logger.info(f"Using school: {school['name']} (ID: {school_id})")
            
            # Search for each professor
            professor_results = []
            for prof_name in professor_names:
                if not prof_name or not prof_name.strip():
                    continue
                    
                try:
                    # Search for this professor
                    professors = await self.search_professors(school_id, prof_name.strip())
                    
                    if professors:
                        # Take the first match (usually most relevant)
                        professor = professors[0]
                        
                        # Format the response with additional calculated fields
                        formatted_professor = {
                            **professor,
                            "formattedName": f"{professor['firstName']} {professor['lastName']}",
                            "link": f"https://www.ratemyprofessors.com/professor/{professor['legacyId']}"
                        }
                        
                        professor_results.append({
                            "search_name": prof_name,
                            "found": True,
                            "professor": formatted_professor
                        })
                    else:
                        professor_results.append({
                            "search_name": prof_name,
                            "found": False,
                            "professor": None
                        })
                        
                except Exception as e:
                    logger.error(f"Error searching for professor {prof_name}: {e}")
                    professor_results.append({
                        "search_name": prof_name,
                        "found": False,
                        "professor": None,
                        "error": str(e)
                    })
            
            return {
                "school_found": True,
                "school": school,
                "professors": professor_results,
                "total_searched": len(professor_names),
                "total_found": len([p for p in professor_results if p["found"]])
            }
            
        except Exception as e:
            logger.error(f"Failed to search professors for course: {e}")
            return {"school_found": False, "professors": [], "error": str(e)}

    async def get_professors_with_reviews(self, school_name: str, professor_names: List[str], course_filter: Optional[str] = None) -> Dict[str, Any]:
        """
        🆕 ENHANCED: Get professors with their complete RMP reviews for course analysis
        """
        try:
            logger.info(f"Getting professors with reviews for {school_name}: {professor_names}")
            
            # First get basic professor data
            basic_results = await self.search_professors_for_course(school_name, professor_names)
            
            if not basic_results.get("school_found"):
                return basic_results
            
            # Now fetch detailed reviews for each found professor
            enhanced_professors = []
            
            for prof_result in basic_results["professors"]:
                if not prof_result["found"]:
                    enhanced_professors.append(prof_result)
                    continue
                
                professor = prof_result["professor"]
                prof_id = professor["id"]
                
                try:
                    # Get all reviews for this professor
                    all_comments = await self.get_professor_comments(prof_id)
                    
                    # Filter by course if specified
                    filtered_comments = all_comments
                    if course_filter:
                        filtered_comments = [
                            comment for comment in all_comments
                            if course_filter.lower() in comment.get("class", "").lower()
                        ]
                    
                    # Add review data to professor info
                    enhanced_professor = {
                        **prof_result,
                        "professor": {
                            **professor,
                            "all_reviews_count": len(all_comments),
                            "course_specific_reviews_count": len(filtered_comments) if course_filter else len(all_comments),
                            "all_reviews": all_comments,
                            "course_specific_reviews": filtered_comments if course_filter else all_comments,
                            "courses_taught": list(set([comment.get("class", "") for comment in all_comments if comment.get("class")]))
                        }
                    }
                    
                    enhanced_professors.append(enhanced_professor)
                    logger.info(f"Added {len(filtered_comments)} reviews for {professor['formattedName']}")
                    
                except Exception as e:
                    logger.error(f"Error getting reviews for {professor['formattedName']}: {e}")
                    # Still include professor without reviews
                    enhanced_professors.append({
                        **prof_result,
                        "review_error": str(e)
                    })
            
            return {
                **basic_results,
                "professors": enhanced_professors,
                "course_filter": course_filter,
                "enhanced": True
            }
            
        except Exception as e:
            logger.error(f"Failed to get professors with reviews: {e}")
            return {"school_found": False, "professors": [], "error": str(e)}

    async def bulk_professor_lookup(self, professor_list: List[Dict[str, Any]], school_id: str) -> List[Dict[str, Any]]:
        """
        🆕 Efficiently lookup multiple professors and get their basic data
        """
        try:
            logger.info(f"Bulk lookup for {len(professor_list)} professors")
            
            results = []
            
            # Process in batches to avoid overwhelming the API
            batch_size = 5
            for i in range(0, len(professor_list), batch_size):
                batch = professor_list[i:i + batch_size]
                batch_tasks = []
                
                for prof_info in batch:
                    prof_name = prof_info.get("name", prof_info.get("formattedName", ""))
                    if prof_name:
                        task = self.search_professors(school_id, prof_name)
                        batch_tasks.append((prof_name, task))
                
                # Execute batch in parallel
                batch_results = await asyncio.gather(*[task for _, task in batch_tasks], return_exceptions=True)
                
                # Process batch results
                for (prof_name, _), result in zip(batch_tasks, batch_results):
                    if isinstance(result, Exception):
                        logger.error(f"Error searching for {prof_name}: {result}")
                        results.append({"name": prof_name, "found": False, "error": str(result)})
                    elif result and len(result) > 0:
                        results.append({"name": prof_name, "found": True, "professor": result[0]})
                    else:
                        results.append({"name": prof_name, "found": False, "professor": None})
                
                # Small delay between batches
                await asyncio.sleep(0.5)
            
            logger.info(f"Bulk lookup completed: {len([r for r in results if r['found']])} found out of {len(results)}")
            return results
            
        except Exception as e:
            logger.error(f"Bulk professor lookup failed: {e}")
            return []

    async def get_course_specific_professor_data(self, course_code: str, extracted_professors: List[str], school_name: str = "University of California Riverside") -> Dict[str, Any]:
        """
        🆕 MAIN INTEGRATION METHOD: Get complete professor data for a specific course
        """
        try:
            logger.info(f"Getting course-specific professor data for {course_code}")
            
            # Get professors with all their reviews
            professor_data = await self.get_professors_with_reviews(
                school_name=school_name,
                professor_names=extracted_professors,
                course_filter=course_code
            )
            
            if not professor_data.get("school_found"):
                return professor_data
            
            # Process and format for AI analysis
            formatted_professors = []
            
            for prof_result in professor_data["professors"]:
                if not prof_result["found"]:
                    continue
                
                professor = prof_result["professor"]
                course_reviews = professor.get("course_specific_reviews", [])
                all_reviews = professor.get("all_reviews", [])
                
                # Format reviews for AI analysis
                formatted_reviews = []
                for review in course_reviews:
                    formatted_review = {
                        "source": "rmp",
                        "date": review.get("date", ""),
                        "text": review.get("comment", ""),
                        "rating": review.get("clarityRating", 0),
                        "difficulty": review.get("difficultyRating", 0),
                        "grade": review.get("grade", ""),
                        "would_take_again": review.get("wouldTakeAgain"),
                        "class": review.get("class", ""),
                        "tags": review.get("ratingTags", "")
                    }
                    formatted_reviews.append(formatted_review)
                
                formatted_professor = {
                    "name": professor["formattedName"],
                    "rmp_id": professor["id"],
                    "legacy_id": professor["legacyId"],
                    "department": professor["department"],
                    "overall_rating": professor["avgRating"],
                    "difficulty": professor["avgDifficulty"],
                    "num_ratings": professor["numRatings"],
                    "would_take_again_percent": professor["wouldTakeAgainPercent"],
                    "link": professor["link"],
                    "course_specific_reviews": formatted_reviews,
                    "total_reviews_count": len(all_reviews),
                    "course_reviews_count": len(course_reviews),
                    "courses_taught": professor.get("courses_taught", [])
                }
                
                formatted_professors.append(formatted_professor)
            
            return {
                "success": True,
                "course_code": course_code,
                "school": professor_data.get("school", {}),
                "professors": formatted_professors,
                "stats": {
                    "total_professors_searched": len(extracted_professors),
                    "professors_found": len(formatted_professors),
                    "total_course_reviews": sum(prof["course_reviews_count"] for prof in formatted_professors)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get course-specific professor data: {e}")
            return {
                "success": False,
                "error": str(e),
                "course_code": course_code,
                "professors": []
            }

# Create a global instance
rmp_service = RateMyProfessorService() 
"""
Professor Name Extraction Service
--------------------------------
Extracts professor names from Reddit posts, comments, and spreadsheet data.
Handles partial names and provides fuzzy matching against RMP database.
"""

import re
import asyncio
from typing import List, Dict, Set, Optional, Any
import logging
from difflib import SequenceMatcher
from config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProfessorExtractionService:
    def __init__(self):
        """Initialize professor extraction service"""
        self.common_professor_titles = [
            'prof', 'professor', 'dr', 'doctor', 'instructor', 'teacher', 'lecturer'
        ]
        
        # Common first names and their variations to help with partial matching
        self.name_variations = {
            'elena': ['elena'],
            'mike': ['michael', 'mike', 'mikhail'],
            'dave': ['david', 'dave'],
            'chris': ['christopher', 'chris', 'christian'],
            'steve': ['steven', 'steve', 'stephen'],
            'bob': ['robert', 'bob', 'bobby'],
            'jim': ['james', 'jim', 'jimmy'],
            'bill': ['william', 'bill', 'billy'],
            'dan': ['daniel', 'dan', 'danny'],
            'joe': ['joseph', 'joe', 'joey'],
            'alex': ['alexander', 'alexandra', 'alex', 'alexis'],
            'sam': ['samuel', 'samantha', 'sam'],
            'pat': ['patrick', 'patricia', 'pat'],
            'tony': ['anthony', 'antonio', 'tony'],
            'nick': ['nicholas', 'nick', 'nicolas']
        }
        
        logger.info("ProfessorExtractionService initialized")
    
    def extract_professor_names_from_text(self, text: str) -> Set[str]:
        """Extract potential professor names from a single text string"""
        if not text:
            return set()
        
        text_lower = text.lower()
        found_names = set()
        
        # Pattern 1: "Prof/Professor/Dr [Name]"
        title_patterns = [
            r'(?:prof(?:essor)?|dr|instructor|teacher)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)',
            r'([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(?:prof(?:essor)?|dr|instructor|teacher)',
        ]
        
        for pattern in title_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0] if match[0] else match[1]
                name = match.strip()
                if len(name) > 2 and not any(word in name.lower() for word in ['class', 'course', 'exam', 'test']):
                    found_names.add(name.title())
        
        # Pattern 2: Context-based extraction (mentioned near course context)
        # Look for names mentioned near course-related keywords
        course_context_words = ['teaches', 'taught', 'instructor', 'class', 'course', 'section', 'lecture']
        sentences = re.split(r'[.!?]', text)
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(word in sentence_lower for word in course_context_words):
                # Extract capitalized words that might be names
                words = sentence.split()
                for i, word in enumerate(words):
                    if (word.istitle() and len(word) > 2 and 
                        not word.lower() in ['the', 'and', 'but', 'for', 'with', 'class', 'course']):
                        # Check if next word is also capitalized (last name)
                        if i + 1 < len(words) and words[i + 1].istitle():
                            full_name = f"{word} {words[i + 1]}"
                            found_names.add(full_name)
                        else:
                            found_names.add(word)
        
        # Pattern 3: Standalone capitalized names in quotes
        quoted_names = re.findall(r'"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)"', text)
        for name in quoted_names:
            if len(name) > 2:
                found_names.add(name)
        
        return found_names
    
    def extract_from_reddit_data(self, posts_data: List[Dict[str, Any]]) -> Set[str]:
        """Extract professor names from Reddit posts and comments"""
        all_names = set()
        
        for post_data in posts_data:
            post = post_data.get('post', {})
            comments = post_data.get('comments', [])
            
            # Extract from post title and content
            title = post.get('title', '')
            content = post.get('selftext', '')
            
            all_names.update(self.extract_professor_names_from_text(title))
            all_names.update(self.extract_professor_names_from_text(content))
            
            # Extract from comments
            for comment in comments:
                comment_body = comment.get('body', '')
                all_names.update(self.extract_professor_names_from_text(comment_body))
        
        logger.info(f"Extracted {len(all_names)} potential professor names from Reddit data")
        return all_names
    
    def extract_from_spreadsheet_data(self, spreadsheet_data: str) -> Set[str]:
        """Extract professor names from UCR spreadsheet data"""
        if not spreadsheet_data:
            return set()
        
        all_names = set()
        
        # Split by lines and extract from each review comment
        lines = spreadsheet_data.split('\n')
        for line in lines:
            if 'Comments:' in line:
                comment_text = line.split('Comments:', 1)[1].strip()
                all_names.update(self.extract_professor_names_from_text(comment_text))
        
        logger.info(f"Extracted {len(all_names)} potential professor names from spreadsheet data")
        return all_names
    
    def clean_and_normalize_names(self, raw_names: Set[str]) -> List[str]:
        """Clean and normalize extracted names"""
        cleaned_names = []
        
        for name in raw_names:
            # Remove common non-name words
            if any(word in name.lower() for word in [
                'said', 'told', 'asked', 'think', 'know', 'like', 'good', 'bad',
                'easy', 'hard', 'test', 'exam', 'homework', 'assignment', 'grade',
                'class', 'course', 'section', 'chapter', 'book', 'page', 'time'
            ]):
                continue
            
            # Remove very short or very long names
            if len(name) < 3 or len(name) > 50:
                continue
            
            # Remove numbers
            if any(char.isdigit() for char in name):
                continue
            
            cleaned_names.append(name.strip())
        
        # Remove duplicates while preserving order
        unique_names = []
        seen = set()
        for name in cleaned_names:
            if name.lower() not in seen:
                unique_names.append(name)
                seen.add(name.lower())
        
        logger.info(f"Cleaned names: {len(raw_names)} -> {len(unique_names)}")
        return unique_names
    
    def expand_partial_names(self, names: List[str], rmp_professors: List[Dict[str, Any]]) -> List[str]:
        """Expand partial names using RMP professor database"""
        expanded_names = []
        
        for name in names:
            name_lower = name.lower().strip()
            words = name_lower.split()
            
            # If it's already a full name (2+ words), keep it
            if len(words) >= 2:
                expanded_names.append(name)
                continue
            
            # If it's a single word, try to match with RMP professors
            if len(words) == 1:
                single_name = words[0]
                best_matches = []
                
                for prof in rmp_professors:
                    first_name = prof.get('firstName', '').lower()
                    last_name = prof.get('lastName', '').lower()
                    full_name = f"{prof.get('firstName', '')} {prof.get('lastName', '')}"
                    
                    # Exact match on first name
                    if single_name == first_name:
                        best_matches.append(full_name)
                    # Exact match on last name
                    elif single_name == last_name:
                        best_matches.append(full_name)
                    # Check name variations
                    elif single_name in self.name_variations:
                        variations = self.name_variations[single_name]
                        if first_name in variations:
                            best_matches.append(full_name)
                
                if best_matches:
                    # Add all matches for partial names (user can verify)
                    expanded_names.extend(best_matches[:3])  # Limit to top 3 matches
                else:
                    # Keep the partial name if no matches found
                    expanded_names.append(name)
            else:
                expanded_names.append(name)
        
        # Remove duplicates
        unique_expanded = []
        seen = set()
        for name in expanded_names:
            if name.lower() not in seen:
                unique_expanded.append(name)
                seen.add(name.lower())
        
        logger.info(f"Expanded names: {len(names)} -> {len(unique_expanded)}")
        return unique_expanded
    
    def fuzzy_match_with_rmp(self, extracted_names: List[str], rmp_professors: List[Dict[str, Any]], threshold: float = 0.7) -> Dict[str, Dict[str, Any]]:
        """Fuzzy match extracted names with RMP professor database"""
        matched_professors = {}
        
        for extracted_name in extracted_names:
            best_match = None
            best_score = 0
            
            for prof in rmp_professors:
                prof_full_name = f"{prof.get('firstName', '')} {prof.get('lastName', '')}"
                
                # Calculate similarity scores
                full_similarity = SequenceMatcher(None, extracted_name.lower(), prof_full_name.lower()).ratio()
                
                # Also check partial matches
                first_name_similarity = SequenceMatcher(None, extracted_name.lower(), prof.get('firstName', '').lower()).ratio()
                last_name_similarity = SequenceMatcher(None, extracted_name.lower(), prof.get('lastName', '').lower()).ratio()
                
                max_similarity = max(full_similarity, first_name_similarity, last_name_similarity)
                
                if max_similarity > best_score and max_similarity >= threshold:
                    best_score = max_similarity
                    best_match = prof
            
            if best_match:
                matched_professors[extracted_name] = {
                    'professor': best_match,
                    'confidence': best_score,
                    'match_type': 'fuzzy'
                }
        
        logger.info(f"Fuzzy matched {len(matched_professors)} professors out of {len(extracted_names)} extracted names")
        return matched_professors
    
    async def extract_all_professor_names(self, reddit_data: List[Dict[str, Any]], spreadsheet_data: str, rmp_professors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Main method to extract all professor names from all sources"""
        try:
            logger.info("Starting comprehensive professor name extraction")
            
            # Step 1: Extract raw names from all sources
            reddit_names = self.extract_from_reddit_data(reddit_data)
            spreadsheet_names = self.extract_from_spreadsheet_data(spreadsheet_data)
            
            # Combine all extracted names
            all_raw_names = reddit_names.union(spreadsheet_names)
            
            # Step 2: Clean and normalize
            cleaned_names = self.clean_and_normalize_names(all_raw_names)
            
            # Step 3: Expand partial names using RMP database
            expanded_names = self.expand_partial_names(cleaned_names, rmp_professors)
            
            # Step 4: Fuzzy match with RMP professors
            matched_professors = self.fuzzy_match_with_rmp(expanded_names, rmp_professors)
            
            return {
                "success": True,
                "raw_names": list(all_raw_names),
                "cleaned_names": cleaned_names,
                "expanded_names": expanded_names,
                "matched_professors": matched_professors,
                "stats": {
                    "reddit_names": len(reddit_names),
                    "spreadsheet_names": len(spreadsheet_names),
                    "total_raw": len(all_raw_names),
                    "cleaned": len(cleaned_names),
                    "expanded": len(expanded_names),
                    "matched": len(matched_professors)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in professor name extraction: {e}")
            return {
                "success": False,
                "error": str(e),
                "raw_names": [],
                "cleaned_names": [],
                "expanded_names": [],
                "matched_professors": {},
                "stats": {}
            }

# Create global instance
professor_extraction_service = ProfessorExtractionService() 
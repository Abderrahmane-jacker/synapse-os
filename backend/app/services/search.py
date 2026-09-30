from duckduckgo_search import DDGS
import logging

logger = logging.getLogger(__name__)

class WebSearchService:
    def search(self, query: str, max_results: int = 5) -> list:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                return results
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

web_search = WebSearchService()

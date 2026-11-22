import json
import re
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.services.qdrant_client import qdrant_service
from app.schemas.ai import AnalyzeNoteResponse

class AutoTaggerService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()

    def analyze(
        self,
        user_id: str,
        title: str,
        content: str,
        existing_tags: List[str] = None
    ) -> AnalyzeNoteResponse:
        """
        Analyzes note content to produce:
        - Category suggestion
        - Relevant tags (reusing existing where appropriate)
        - 1-sentence description
        - Key technical keywords/concepts
        - Related existing note suggestions
        """
        combined = f"{title}\n\n{content}".strip()
        if not combined:
            return AnalyzeNoteResponse(
                category="General",
                tags=[],
                description="Empty note.",
                keywords=[],
                relatedNoteIds=[]
            )

        # 1. Discover related existing notes by vector search
        related_hits = qdrant_service.search(
            user_id=user_id,
            query=combined[:500],
            filter_type="notes",
            limit=4
        )
        related_ids = [h["sourceId"] for h in related_hits if h["sourceId"]]

        # 2. Extract metadata via LLM or rule-based semantic extractor
        result = self._extract_metadata_llm(title, content, existing_tags or [])
        if not result:
            result = self._extract_metadata_heuristic(title, content, existing_tags or [])

        return AnalyzeNoteResponse(
            category=result.get("category", "General"),
            tags=result.get("tags", []),
            description=result.get("description", "A note in your knowledge vault."),
            keywords=result.get("keywords", []),
            relatedNoteIds=related_ids
        )

    def _extract_metadata_llm(
        self,
        title: str,
        content: str,
        existing_tags: List[str]
    ) -> Optional[Dict[str, Any]]:
        prompt = (
            "Analyze the following note and produce structured metadata in strict JSON format.\n"
            "Return a JSON object with EXACTLY these keys:\n"
            "- 'category': A single broad domain (e.g. 'DevOps', 'Architecture', 'AI/ML', 'Frontend', 'Database', 'Career', 'Personal').\n"
            f"- 'tags': List of 3 to 5 concise tags. Reuse any relevant tags from this existing list if applicable: {existing_tags}. Do not generate redundant or duplicate tags.\n"
            "- 'description': A single concise summary sentence (15-25 words).\n"
            "- 'keywords': 3 to 5 important technical concepts or entities.\n\n"
            f"NOTE TITLE: {title}\n"
            f"NOTE CONTENT:\n{content[:2500]}\n\n"
            "Respond ONLY with valid JSON. No markdown ticks, no preamble."
        )

        # Gemini
        if self.provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")
                res = model.generate_content(prompt)
                raw_text = res.text.strip()
                # Clean json codeblocks if any
                clean_json = re.sub(r"^```json\s*", "", raw_text)
                clean_json = re.sub(r"\s*```$", "", clean_json).strip()
                return json.loads(clean_json)
            except Exception as e:
                print(f"[AutoTagger] Gemini tagging error: {e}")

        # OpenAI
        if self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )
                return json.loads(resp.choices[0].message.content)
            except Exception as e:
                print(f"[AutoTagger] OpenAI tagging error: {e}")

        return None

    def _extract_metadata_heuristic(
        self,
        title: str,
        content: str,
        existing_tags: List[str]
    ) -> Dict[str, Any]:
        """Heuristic semantic analysis fallback for zero-API-key local setups"""
        text = f"{title} {content}".lower()

        # Domain dictionaries
        categories = {
            "DevOps": ["docker", "kubernetes", "k8s", "ci/cd", "pipeline", "deploy", "cluster", "container", "helm", "terraform"],
            "Cloud Computing": ["aws", "azure", "gcp", "s3", "ec2", "cloud", "serverless", "lambda"],
            "System Architecture": ["microservice", "distributed", "resilience", "circuit breaker", "kafka", "event", "grpc", "cache"],
            "AI & Machine Learning": ["rag", "llm", "embedding", "vector", "neural", "deep learning", "gpt", "model", "transformer"],
            "Database & Storage": ["postgres", "sql", "redis", "qdrant", "database", "mongodb", "indexing", "partition"],
            "Software Engineering": ["react", "typescript", "javascript", "python", "node", "api", "rest", "frontend", "backend"],
        }

        matched_cat = "General"
        max_matches = 0
        for cat, keywords in categories.items():
            matches = sum(1 for kw in keywords if kw in text)
            if matches > max_matches:
                max_matches = matches
                matched_cat = cat

        # Generate tags from found keywords and existing tags
        tags = []
        for kw in categories.get(matched_cat, []):
            if kw in text:
                tags.append(kw.capitalize())
        
        # Check against existing tags
        for et in existing_tags:
            if et.lower() in text and et not in tags:
                tags.append(et)

        if not tags:
            tags = [matched_cat]

        # Extract keywords
        words = re.findall(r"\b[A-Za-z]{4,}\b", text)
        common_words = {"this", "that", "with", "from", "have", "more", "also", "using", "into", "their"}
        filtered = [w.capitalize() for w in words if w not in common_words]
        keywords = list(dict.fromkeys(filtered))[:4]

        # Generate short description
        clean_content = content.replace("\n", " ").strip()
        description = clean_content[:120] + "..." if len(clean_content) > 120 else clean_content or f"Overview of {title}."

        return {
            "category": matched_cat,
            "tags": tags[:4],
            "description": description,
            "keywords": keywords,
        }

tagger_service = AutoTaggerService()

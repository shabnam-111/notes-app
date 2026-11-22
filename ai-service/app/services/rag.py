import os
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.services.qdrant_client import qdrant_service
from app.schemas.ai import CitationItem, RAGChatResponse

class RAGService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()

    def chat(self, user_id: str, message: str, history: List[Dict[str, str]] = None) -> RAGChatResponse:
        """
        Executes end-to-end RAG:
        1. Multi-tenant vector retrieval for user_id
        2. Context building with note and document excerpts
        3. Strict grounding prompt
        4. LLM inference with provider abstraction
        5. Citation resolution
        """
        # Retrieve candidates, then take one focused passage per source.
        retrieved_hits = qdrant_service.search(
            user_id=user_id,
            query=message,
            filter_type="all",
            limit=12,
            offset=0
        )

        citations: List[CitationItem] = []
        context_blocks: List[str] = []
        seen_sources = set()

        for hit in retrieved_hits:
            source_type = hit["sourceType"]
            source_key = (source_type, hit["sourceId"])
            if source_key in seen_sources:
                continue
            seen_sources.add(source_key)
            title = hit["title"]
            excerpt = hit["excerpt"]
            page = hit.get("pageNumber")
            score = hit.get("score", 0.0)

            ref_tag = f"[{source_type.upper()}: {title}" + (f", Page {page}" if page else "") + "]"
            context_blocks.append(f"{ref_tag}\n{excerpt}")

            citations.append(CitationItem(
                sourceId=hit["sourceId"],
                title=title,
                type=source_type,
                pageNumber=page,
                excerpt=excerpt,
                score=score
            ))
            if len(citations) == 3:
                break

        has_context = len(context_blocks) > 0
        context_str = "\n\n---\n\n".join(context_blocks) if has_context else "No relevant notes or documents found in knowledge base."

        # 2. Build system instructions
        system_instruction = (
            "You are MindVault, an intelligent personal knowledge assistant. "
            "Your highest priority is to answer the user's question using their saved notes and uploaded documents provided in CONTEXT below.\n"
            "Rules:\n"
            "1. Base your answer primarily on the provided CONTEXT.\n"
            "2. Whenever citing information from the context, reference the source using its tag (e.g. [NOTE: Title] or [DOCUMENT: Title, Page X]).\n"
            "3. If the context does not contain sufficient information to answer the question, state clearly: "
            "'Based on your saved notes and documents, I could not find information regarding this topic.' "
            "You may then provide a general answer, but you MUST explicitly state that it comes from general knowledge and not from their saved notes.\n"
            "4. NEVER fabricate citations or invent nonexistent notes.\n"
            "5. Maintain a professional, concise, and structured tone."
        )

        # 3. Call LLM Provider
        answer, model_name = self._generate_response(system_instruction, context_str, message, history)

        return RAGChatResponse(
            answer=answer,
            citations=citations,
            model=model_name,
            fromKnowledgeBase=has_context
        )

    def _generate_response(
        self,
        system_instruction: str,
        context: str,
        prompt: str,
        history: Optional[List[Dict[str, str]]]
    ) -> (str, str):
        # 1. Google Gemini
        if self.provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                
                # Check available models, default to gemini-1.5-flash
                model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=system_instruction
                )

                chat_history = []
                if history:
                    for h in history[-6:]:  # include up to 3 turns
                        role = "user" if h.get("role") == "user" else "model"
                        chat_history.append({"role": role, "parts": [h.get("content", "")]})

                chat_session = model.start_chat(history=chat_history)
                user_content = f"CONTEXT FROM USER'S KNOWLEDGE BASE:\n{context}\n\nUSER QUESTION:\n{prompt}"
                res = chat_session.send_message(user_content)
                return res.text, "gemini-1.5-flash"
            except Exception as e:
                print(f"[RAGService] Gemini call warning: {e}. Falling back to grounded contextual synthesis.")

        # 2. OpenAI
        if self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                messages = [{"role": "system", "content": system_instruction}]
                if history:
                    for h in history[-6:]:
                        role = "user" if h.get("role") == "user" else "assistant"
                        messages.append({"role": role, "content": h.get("content", "")})
                
                messages.append({
                    "role": "user",
                    "content": f"CONTEXT FROM USER'S KNOWLEDGE BASE:\n{context}\n\nUSER QUESTION:\n{prompt}"
                })

                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.2
                )
                return resp.choices[0].message.content, "gpt-4o-mini"
            except Exception as e:
                print(f"[RAGService] OpenAI call warning: {e}. Falling back to grounded contextual synthesis.")

        # 3. Deterministic Grounded Fallback (when API keys are not yet supplied or in offline test mode)
        return self._synthesize_grounded_answer(context, prompt), "mindvault-local-engine"

    def _synthesize_grounded_answer(self, context: str, prompt: str) -> str:
        """Generates a coherent grounded summary directly from retrieved context when external key is unset"""
        if "No relevant notes or documents found" in context:
            return (
                "Based on your saved notes and documents, I could not find information regarding your query.\n\n"
                "*Note: An external LLM API key (GEMINI_API_KEY or OPENAI_API_KEY) can be configured in `.env` to enable multi-turn generative conversation.*"
            )

        paragraphs = [p.strip() for p in context.split("\n\n---\n\n") if p.strip()]
        synthesis = ["Here is what I found in your knowledge base regarding your question:\n"]
        for p in paragraphs:
            lines = p.split("\n", 1)
            source_tag = lines[0]
            body = lines[1] if len(lines) > 1 else lines[0]
            synthesis.append(f"**From {source_tag}**:\n> {body}\n")

        synthesis.append(
            "\n*Information directly synthesized from your indexed notes and documents.*"
        )
        return "\n".join(synthesis)

rag_service = RAGService()

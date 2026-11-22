from typing import List, Dict, Any

class SemanticChunker:
    """Recursive character chunker that preserves page numbers and sentence boundaries"""

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, parsed_pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes parsed pages [{ "page_number": 1, "text": "..." }]
        Returns chunks [{ "content": "...", "page_number": 1, "token_count": 120, "chunk_index": 0 }]
        """
        all_chunks = []
        global_chunk_idx = 0

        for page in parsed_pages:
            page_num = page.get("page_number", 1)
            text = page.get("text", "").strip()
            if not text:
                continue

            page_chunks = self._split_text(text)
            for chunk_str in page_chunks:
                all_chunks.append({
                    "chunk_index": global_chunk_idx,
                    "content": chunk_str,
                    "page_number": page_num,
                    "token_count": max(1, len(chunk_str) // 4),
                })
                global_chunk_idx += 1

        return all_chunks

    def _split_text(self, text: str) -> List[str]:
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + self.chunk_size, text_len)

            if end < text_len:
                # Look for natural separators in priority order
                cut_point = -1
                for sep in ["\n\n", "\n", ". ", "? ", "! ", " "]:
                    pos = text.rfind(sep, start + self.chunk_size // 2, end)
                    if pos != -1:
                        cut_point = pos + len(sep)
                        break

                if cut_point != -1 and cut_point > start:
                    end = cut_point

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(chunk_text)

            if end >= text_len:
                break

            # Advance by chunk_size minus overlap
            start = max(start + 1, end - self.chunk_overlap)

        return chunks

chunker = SemanticChunker()

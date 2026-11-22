from app.services.chunker import SemanticChunker

def test_semantic_chunker_basic():
    chunker = SemanticChunker(chunk_size=100, chunk_overlap=20)
    pages = [
        {"page_number": 1, "text": "This is page 1 content discussing Kubernetes and container management. " * 3},
        {"page_number": 2, "text": "This is page 2 content discussing Docker and cloud native infrastructure. " * 3}
    ]
    chunks = chunker.chunk_document(pages)
    
    assert len(chunks) > 1
    assert chunks[0]["page_number"] == 1
    assert any(c["page_number"] == 2 for c in chunks)
    assert chunks[0]["token_count"] > 0
    assert "chunk_index" in chunks[0]

def test_semantic_chunker_small_text():
    chunker = SemanticChunker(chunk_size=500, chunk_overlap=50)
    pages = [{"page_number": 1, "text": "Short note title and brief description."}]
    chunks = chunker.chunk_document(pages)
    
    assert len(chunks) == 1
    assert chunks[0]["content"] == "Short note title and brief description."
    assert chunks[0]["page_number"] == 1

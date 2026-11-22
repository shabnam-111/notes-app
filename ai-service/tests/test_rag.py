from app.services.embedding import embedding_service
from app.services.qdrant_client import qdrant_service
from app.services.rag import rag_service

def test_embedding_service_deterministic():
    vec1 = embedding_service.embed_text("Kubernetes container orchestration")
    vec2 = embedding_service.embed_text("Kubernetes container orchestration")
    vec3 = embedding_service.embed_text("Completely unrelated baking recipe")
    
    assert len(vec1) == embedding_service.dimension
    assert vec1 == vec2
    assert vec1 != vec3

def test_rag_user_isolation():
    # User A notes
    qdrant_service.upsert_note(
        user_id="user-A",
        note_id="note-A1",
        title="Docker Swarm Notes",
        content="Docker swarm facilitates simple container clustering."
    )
    
    # User B notes
    qdrant_service.upsert_note(
        user_id="user-B",
        note_id="note-B1",
        title="Secret Financial Ledger",
        content="Confidential revenue projections and quarterly EBITDA."
    )

    # User A queries about EBITDA - MUST NOT retrieve User B note
    results_a = qdrant_service.search(
        user_id="user-A",
        query="EBITDA revenue",
        filter_type="all",
        limit=5
    )
    
    found_ids_a = [r["sourceId"] for r in results_a]
    assert "note-B1" not in found_ids_a

    # User B queries about EBITDA - SHOULD retrieve note-B1
    results_b = qdrant_service.search(
        user_id="user-B",
        query="EBITDA revenue",
        filter_type="all",
        limit=5
    )
    found_ids_b = [r["sourceId"] for r in results_b]
    assert "note-B1" in found_ids_b

def test_rag_chat_citation_generation():
    qdrant_service.upsert_note(
        user_id="user-test",
        note_id="note-arch-1",
        title="Microservices Architecture",
        content="We use event-driven architecture with Kafka for asynchronous messaging."
    )

    chat_res = rag_service.chat(
        user_id="user-test",
        message="What messaging system do we use?"
    )

    assert chat_res.fromKnowledgeBase is True
    assert len(chat_res.citations) > 0
    assert chat_res.citations[0].sourceId == "note-arch-1"
    assert "Microservices Architecture" in chat_res.citations[0].title


def test_search_and_chat_omit_unrelated_notes_in_the_same_account():
    user_id = "relevance-check"
    qdrant_service.upsert_note(
        user_id=user_id,
        note_id="robotics",
        title="Robotics club meeting",
        content="The robotics club meets in Lab 204. The treasurer paid the invoice yesterday.",
    )
    qdrant_service.upsert_note(
        user_id=user_id,
        note_id="bread",
        title="Sourdough",
        content="To bake sourdough, heat the oven and feed the starter.",
    )

    question = "Where is the robotics club meeting?"
    results = qdrant_service.search(user_id, question)
    assert [result["sourceId"] for result in results] == ["robotics"]

    answer = rag_service.chat(user_id, question)
    assert [citation.sourceId for citation in answer.citations] == ["robotics"]
    assert "Lab 204" in answer.answer
    assert "invoice" not in answer.answer
    assert "sourdough" not in answer.answer.lower()

    assert qdrant_service.search(user_id, "Who composed Clair de Lune?") == []
    assert not rag_service.chat(user_id, "Who composed Clair de Lune?").fromKnowledgeBase

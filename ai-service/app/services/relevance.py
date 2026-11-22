import re

import numpy as np

from app.services.embedding import embedding_service


_COMMON_WORDS = frozenset(
    "about all am an and are as at be by can could did do does for from had have how "
    "i in is it its me my of on or our please should tell than that the their them "
    "these they this those to us was we were what when where which who why will with would you your"
    .split()
)


def topic_terms(text: str) -> set[str]:
    return set(re.findall(r"[^\W_]+", text.casefold())) - _COMMON_WORDS


def relevant_hits(query: str, query_vector: list[float], hits: list[dict], limit: int, offset: int) -> list[dict]:
    terms = topic_terms(query)
    if not terms:
        return []

    ranked = []
    passage_candidates = []
    for hit in hits:
        content = hit["excerpt"]
        title_matches = terms & topic_terms(hit["title"])
        matches = title_matches | (terms & topic_terms(content))
        coverage = len(matches) / len(terms)
        if hit["score"] < 0.45 and coverage < 0.5 and not title_matches:
            continue
        excerpt = select_excerpt(content, query)[:300]
        bonus = 0.20 * coverage + 0.10 * len(title_matches) / len(terms)
        result = {**hit, "excerpt": excerpt}
        if hit["score"] >= 0.45 or coverage >= 0.5:
            ranked.append((hit["score"] + bonus, result))
        else:
            passage_candidates.append((bonus, result))

    # A long note's full embedding can hide a short passage that answers the question.
    if passage_candidates:
        passages = [f'{hit["title"]}\n{hit["excerpt"]}' for _, hit in passage_candidates]
        query_norm = np.linalg.norm(query_vector) or 1.0
        for (bonus, hit), vector in zip(passage_candidates, embedding_service.embed_batch(passages)):
            vector_norm = np.linalg.norm(vector) or 1.0
            score = float(np.dot(query_vector, vector) / (query_norm * vector_norm))
            if score >= 0.45:
                ranked.append((score + bonus, {**hit, "score": round(score, 4)}))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [hit for _, hit in ranked[offset:offset + limit]]


def select_excerpt(excerpt: str, query: str) -> str:
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", excerpt) if part.strip()]
    if len(sentences) <= 1:
        return excerpt
    terms = topic_terms(query)
    ranked = sorted(
        range(len(sentences)), key=lambda index: len(terms & topic_terms(sentences[index])), reverse=True
    )
    best = ranked[0]
    if not terms & topic_terms(sentences[best]):
        return sentences[0]
    return sentences[best]

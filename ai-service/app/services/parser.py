import os
import io
from typing import List, Dict, Any

class DocumentParser:
    """Parses PDF, DOCX, TXT, and Markdown files with structural page awareness and OCR fallback"""

    @classmethod
    def parse_file(cls, file_path: str, file_type: str) -> List[Dict[str, Any]]:
        """
        Parses a file and returns a list of pages/sections:
        [{ "page_number": 1, "text": "..." }, ...]
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_type = file_type.lower().replace(".", "")

        if file_type == "pdf":
            return cls._parse_pdf(file_path)
        elif file_type == "docx":
            return cls._parse_docx(file_path)
        elif file_type in ["txt", "md", "markdown"]:
            return cls._parse_text(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_type}")

    @classmethod
    def _parse_pdf(cls, file_path: str) -> List[Dict[str, Any]]:
        pages = []

        # 1. Try PyPDF first for rapid text extraction
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                # If page text is very sparse (< 20 chars), attempt OCR if available
                if len(text.strip()) < 20:
                    ocr_text = cls._try_ocr_pdf_page(file_path, idx)
                    if ocr_text:
                        text = ocr_text

                if text.strip():
                    pages.append({
                        "page_number": idx + 1,
                        "text": text.strip()
                    })
            if pages:
                return pages
        except Exception as e:
            print(f"[DocumentParser] PyPDF extraction notice: {e}. Trying pdfplumber...")

        # 2. Try pdfplumber fallback
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for idx, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    if text.strip():
                        pages.append({
                            "page_number": idx + 1,
                            "text": text.strip()
                        })
            if pages:
                return pages
        except Exception as e:
            print(f"[DocumentParser] pdfplumber extraction notice: {e}")

        # If both failed or document is empty
        if not pages:
            pages.append({"page_number": 1, "text": "Document contained no extractable text layer."})
        return pages

    @classmethod
    def _try_ocr_pdf_page(cls, file_path: str, page_idx: int) -> str:
        """Attempt OCR on scanned PDF page using pytesseract if available"""
        try:
            import pytesseract
            from pypdf import PdfReader
            # Check if tesseract binary is available
            pytesseract.get_tesseract_version()
            # If pdfplumber is present, we can rasterize page
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                if page_idx < len(pdf.pages):
                    img = pdf.pages[page_idx].to_image(resolution=150).original
                    return pytesseract.image_to_string(img)
        except Exception:
            pass
        return ""

    @classmethod
    def _parse_docx(cls, file_path: str) -> List[Dict[str, Any]]:
        try:
            import docx
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                if para.text.strip():
                    full_text.append(para.text.strip())
            
            # Also extract tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_text:
                        full_text.append(" | ".join(row_text))

            content = "\n\n".join(full_text)
            return [{"page_number": 1, "text": content or "Empty Word document."}]
        except Exception as e:
            raise RuntimeError(f"Error parsing DOCX file: {e}")

    @classmethod
    def _parse_text(cls, file_path: str) -> List[Dict[str, Any]]:
        encodings = ["utf-8", "latin-1", "cp1252"]
        content = ""
        for enc in encodings:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    content = f.read()
                break
            except UnicodeDecodeError:
                continue

        if not content:
            content = "Empty text document."
        return [{"page_number": 1, "text": content.strip()}]

import fitz  # PyMuPDF
import cv2
import numpy as np
import os
import pytest
import allure

from skimage.metrics import structural_similarity as ssim


# ---------------- CONFIG ---------------- #

SIMILARITY_THRESHOLD = 0.9999

PDF_1 = "doc1.pdf"
PDF_2 = "doc2.pdf"

DIFF_DIR = "diff_output"


# ---------------- HELPERS ---------------- #

def pdf_to_images(pdf_path):
    doc = fitz.open(pdf_path)
    images = []

    for page in doc:
        pix = page.get_pixmap(dpi=200)

        img = np.frombuffer(pix.samples, dtype=np.uint8)
        img = img.reshape(pix.height, pix.width, pix.n)

        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

        images.append(img)

    return images


def compare_and_save_diff(img1, img2, page_num):

    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    score, diff = ssim(gray1, gray2, full=True)

    if score >= SIMILARITY_THRESHOLD:
        return score, None

    diff = (diff * 255).astype("uint8")

    _, thresh = cv2.threshold(
        diff, 200, 255, cv2.THRESH_BINARY_INV
    )

    contours, _ = cv2.findContours(
        thresh,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    marked = img2.copy()

    for c in contours:
        if cv2.contourArea(c) > 80:

            x, y, w, h = cv2.boundingRect(c)

            cv2.rectangle(
                marked,
                (x, y),
                (x + w, y + h),
                (0, 0, 255),
                2
            )

    os.makedirs(DIFF_DIR, exist_ok=True)

    diff_path = f"{DIFF_DIR}/page_{page_num}_diff.png"

    cv2.imwrite(diff_path, marked)

    return score, diff_path


# ---------------- TEST ---------------- #

@allure.feature("PDF Visual Validation")
@allure.story("Compare two PDFs page by page")
@allure.title("Visual PDF Comparison")
def test_pdf_visual_comparison():

    imgs1 = pdf_to_images(PDF_1)
    imgs2 = pdf_to_images(PDF_2)

    page_count = min(len(imgs1), len(imgs2))

    assert page_count > 0, "No pages found in PDFs"

    failed_pages = []

    for i in range(page_count):

        page_num = i + 1

        with allure.step(f"Compare Page {page_num}"):

            score, diff_path = compare_and_save_diff(
                imgs1[i],
                imgs2[i],
                page_num
            )

            # Always attach score
            allure.attach(
                f"{score:.4f}",
                name=f"Similarity Page {page_num}",
                attachment_type=allure.attachment_type.TEXT
            )

            if diff_path:

                # Attach diff image
                with open(diff_path, "rb") as f:
                    allure.attach(
                        f.read(),
                        name=f"Diff Page {page_num}",
                        attachment_type=allure.attachment_type.PNG
                    )

                failed_pages.append(
                    f"Page {page_num} → {score:.4f}"
                )

            else:
                allure.attach(
                    "PASS",
                    name=f"Result Page {page_num}",
                    attachment_type=allure.attachment_type.TEXT
                )

    # ---------- Final Assertion ---------- #

    if failed_pages:

        summary = "\n".join(failed_pages)

        allure.attach(
            summary,
            name="Failed Pages Summary",
            attachment_type=allure.attachment_type.TEXT
        )

        pytest.fail(
            f"\nVisual differences found:\n{summary}",
            pytrace=False
        )

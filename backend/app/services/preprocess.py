import cv2
import numpy as np

def preprocess_for_ocr(image_path):
    img = cv2.imread(image_path)

    if img is None:
        return image_path

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Improve contrast
    norm = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)

    # Remove noise
    denoise = cv2.fastNlMeansDenoising(norm, None, 30, 7, 21)

    # Threshold
    thresh = cv2.adaptiveThreshold(
        denoise,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        2
    )

    # Add padding (prevents edge clipping)
    padded = cv2.copyMakeBorder(
        thresh,
        60, 60, 60, 60,
        cv2.BORDER_CONSTANT,
        value=255
    )

    # Save temp file
    temp_path = image_path.replace(".", "_processed.")
    cv2.imwrite(temp_path, padded)

    return temp_path

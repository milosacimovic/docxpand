"""Script to extract field locations from SVGs."""
import datetime
import getpass
import logging
import os
import json
from pathlib import Path
import subprocess

import click
import tqdm

from docxpand.dataset import DocFakerDataset


logger = logging.getLogger(__name__)


@click.command()
@click.option(
    "-dd",
    "--document-dataset",
    type=click.Path(dir_okay=False, file_okay=True, readable=True),
    required=True,
    help="Path to the dataset JSON with generated SVG/PNG documents.",
)
@click.option(
    "-di",
    "--document-images",
    type=click.Path(dir_okay=True, file_okay=True, readable=True),
    required=True,
    help="Path to the directory containing documents dataset images.",
)
@click.option(
    "-o",
    "--output-directory",
    type=click.Path(dir_okay=True, file_okay=False, writable=True),
    required=True,
    help="Path to output directory where new datasets will be stored.",
)
def extract_ocr_from_svgs(
    document_dataset: str,
    document_images: str,
    output_directory: str,
) -> None:
    """Extract fields locations from SVGs."""
    documents = []
    input_dataset = DocFakerDataset(
        dataset_input=document_dataset,
        images_dir=document_images
    )

    output_directory = Path(output_directory)
    output_directory.mkdir(parents=True, exist_ok=True)

    document_images = Path(document_images)

    progress = tqdm.tqdm(input_dataset.documents.items())
    progress.set_description("Extracting field locations from SVGs")

    for doc_id, doc_entry in progress:
        # SVG filename
        filename = os.path.join(document_images, doc_entry["filename"])
        # Switch the extension to .svg
        filename = os.path.splitext(filename)[0] + ".svg"

        print("Processing", filename)
        # Call the OCR extractor which is a node script
        cmd = ['node', 'scripts/dataset/extract_ocr_from_svg.js', 
                   filename, 
                   os.path.join(document_images, 'word_bboxes.json')]
        print("Cmd: ", " ".join(cmd))
        subprocess.run(cmd)

        # Load the extracted OCR data
        with open(os.path.join(document_images, 'word_bboxes.json'), 'r') as f:
            ocr_data = json.load(f)

        documents.append({
            "ocr_data": ocr_data,
            "filename": doc_entry["filename"],
        })

    output_dataset_dict = {
        "__class__": "DocFakerOCRDataset",
        "documents": documents,
        "info": {
            "author": getpass.getuser(),
            "createdAt": datetime.datetime.utcnow().isoformat(),
            "description": input_dataset.info().get("description"),
            "name": input_dataset.info().get("name")
        }
    }

    #output_dataset = DocFakerDataset(output_dataset_dict)
    filename = os.path.join(output_directory, os.path.basename(document_dataset))
    with open(filename, "w") as f:
        json.dump(output_dataset_dict, f, indent=2)

if __name__ == "__main__":
    extract_ocr_from_svgs()

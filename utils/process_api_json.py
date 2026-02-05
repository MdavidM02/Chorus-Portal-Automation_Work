#==================================================================================================================
# After executing the WebDriver IO automatomation suite, we are collecting the APIs been sent to the server.
# Inorder to use these APIs in the API automation framework, the json file needs to be transformed into Excel file.
# To use this program, just change file_name.
# Author : John V Panicker - Jan 2026.
#===================================================================================================================

#!/usr/bin/env python3
"""
Utility Script: Convert API JSON Logs to Excel

This script:
1. Accepts a JSON file path as a command-line parameter.
2. Reads API request data from that JSON file.
3. Normalizes and cleans the data.
4. Removes duplicate URLs.
5. Exports the final result to an Excel file.

Directory Structure Assumption:
-------------------------------
project_root/
│
├── utils/
│   └── process_api_json.py   (this script)
│
└── artifacts/
    └── input_file.json       (input JSON file)

The script can be run from the project root like this:

python utils/process_api_json.py artifacts/input_file.json
"""

import argparse
import json
import os
import pandas as pd
from urllib.parse import urlparse


# -------------------------------------------------
# Function: parse_arguments
# -------------------------------------------------
def parse_arguments():
    """
    Parse command-line arguments.

    Returns:
        argparse.Namespace: Parsed arguments containing input_file
    """

    parser = argparse.ArgumentParser(
        description="Convert API JSON logs into an Excel file"
    )

    # Positional argument: input JSON file path
    parser.add_argument(
        "input_file",
        help="Path to input JSON file (e.g., artifacts/apis.json)"
    )

    return parser.parse_args()


# -------------------------------------------------
# Function: load_json_file
# -------------------------------------------------
def load_json_file(file_path):
    """
    Load and parse a JSON file.

    Args:
        file_path (str): Path to JSON file

    Returns:
        list: Parsed JSON content as a list
    """

    # Verify that the file exists
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")

    # Open and load JSON data
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Normalize: ensure data is always a list
    if isinstance(data, dict):
        data = [data]

    return data


# -------------------------------------------------
# Function: normalize_url
# -------------------------------------------------
def normalize_url(raw_url):
    """
    Remove query parameters from a URL.

    Args:
        raw_url (str): Original URL

    Returns:
        str: Cleaned URL without query parameters
    """

    parsed = urlparse(raw_url)

    # Rebuild URL without query parameters
    clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"

    return clean_url


# -------------------------------------------------
# Function: format_payload
# -------------------------------------------------
def format_payload(raw_payload):
    """
    Pretty-print JSON payload if possible.

    Args:
        raw_payload (str): Raw payload string

    Returns:
        str: Formatted payload
    """

    if not raw_payload:
        return ""

    try:
        # Attempt to parse and pretty-print JSON
        payload = json.dumps(
            json.loads(raw_payload),
            indent=2
        )
    except Exception:
        # If parsing fails, return original text
        payload = raw_payload

    return payload


# -------------------------------------------------
# Function: process_entries
# -------------------------------------------------
def process_entries(data):
    """
    Convert JSON entries into tabular rows.

    Args:
        data (list): List of API request entries

    Returns:
        list: List of dictionaries for DataFrame creation
    """

    rows = []

    for entry in data:

        # Extract HTTP method (GET, POST, etc.)
        method = entry.get("method", "")

        # Extract and normalize URL
        raw_url = entry.get("url", "")
        clean_url = normalize_url(raw_url)

        # Extract and format payload
        raw_payload = entry.get("postData", "")
        payload = format_payload(raw_payload)

        # Build a single row
        row = {
            "method": method,
            "environment": "dev",
            "base_url": clean_url,
            "username": "JPANICKE",
            "password": "Ai4P@ssword5",
            "token": "",
            "payload": payload
        }

        rows.append(row)

    return rows


# -------------------------------------------------
# Function: export_to_excel
# -------------------------------------------------
def export_to_excel(rows, output_file="artifacts/output.xlsx"):
    """
    Export processed rows to an Excel file.

    Args:
        rows (list): List of row dictionaries
        output_file (str): Name of output Excel file

    Returns:
        tuple: (original_count, cleaned_count)
    """

    # Create DataFrame from rows
    df = pd.DataFrame(rows)

    # Remove duplicate URLs (keep first occurrence)
    df_clean = df.drop_duplicates(
        subset="base_url",
        keep="first"
    )

    # Write to Excel
    df_clean.to_excel(output_file, index=False)

    return len(df), len(df_clean)


# -------------------------------------------------
# Main Function
# -------------------------------------------------
def main():
    """
    Main entry point of the script.
    """

    # Parse command-line parameters
    args = parse_arguments()

    # Get input file path
    input_file = args.input_file

    try:
        # Load JSON data
        data = load_json_file(input_file)

        # Convert JSON entries to rows
        rows = process_entries(data)

        # Export rows to Excel
        # Save output inside the artifacts directory
        output_file = "artifacts/output.xlsx"
        original_count, cleaned_count = export_to_excel(
            rows,
            output_file
        )

        # Logging / Summary Output
        print("Excel file created:", output_file)
        print("Input file:", input_file)
        print("Original rows:", original_count)
        print("After removing duplicates:", cleaned_count)
        print("Duplicates removed:", original_count - cleaned_count)

    except Exception as e:
        # Catch and display any runtime errors
        print("Error:", str(e))
        raise


# -------------------------------------------------
# Script Entry Point
# -------------------------------------------------
if __name__ == "__main__":
    main()

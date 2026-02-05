#!/usr/bin/env python3
"""
Utility Script: Clean and Deduplicate Excel File

This script:
1. Accepts an input Excel (.xlsx) file path as a command-line parameter.
2. Loads the Excel file from the artifacts directory.
3. Sorts rows so records with Execute = 'Y' are prioritized.
4. Removes duplicate entries based on the base_url column.
5. Saves the cleaned Excel file back to the artifacts directory.

Directory Structure Assumption:
-------------------------------
project_root/
│
├── utils/
│   └── clean_excel.py        (this script)
│
└── artifacts/
    └── input_file.xlsx       (input Excel file)

Run the script from the project root:

python utils/clean_excel.py artifacts/input_file.xlsx

Author : John V Panicker -- Jan 2026
"""

import argparse
import os
import sys
import pandas as pd


# -------------------------------------------------
# Function: parse_arguments
# -------------------------------------------------
def parse_arguments():
    """
    Parse command-line arguments passed to the script.

    Returns:
        argparse.Namespace: Object containing parsed arguments
    """

    parser = argparse.ArgumentParser(
        description="Clean and deduplicate Excel files"
    )

    # Positional argument for input Excel file
    parser.add_argument(
        "input_file",
        help="Path to input Excel file (e.g., artifacts/input.xlsx)"
    )

    return parser.parse_args()


# -------------------------------------------------
# Function: validate_input_file
# -------------------------------------------------
def validate_input_file(file_path):
    """
    Validate that the input file exists and is an Excel file.

    Args:
        file_path (str): Path to input file

    Raises:
        FileNotFoundError: If file does not exist
        ValueError: If file is not an .xlsx file
    """

    # Check if file exists
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file not found: {file_path}")

    # Check file extension
    if not file_path.lower().endswith(".xlsx"):
        raise ValueError("Input file must be an .xlsx Excel file")


# -------------------------------------------------
# Function: generate_output_path
# -------------------------------------------------
def generate_output_path(input_file):
    """
    Generate output file path inside artifacts directory.

    Example:
        artifacts/input.xlsx  -> artifacts/input_clean.xlsx

    Args:
        input_file (str): Path to input file

    Returns:
        str: Output file path
    """

    # Get directory and filename separately
    directory = os.path.dirname(input_file)
    filename = os.path.basename(input_file)

    # Split name and extension
    name, ext = os.path.splitext(filename)

    # Build new filename
    output_filename = f"{name}_clean{ext}"

    # Join back with original directory (artifacts)
    return os.path.join(directory, output_filename)


# -------------------------------------------------
# Function: load_excel_file
# -------------------------------------------------
def load_excel_file(file_path):
    """
    Load Excel file into a Pandas DataFrame.

    Args:
        file_path (str): Path to Excel file

    Returns:
        pandas.DataFrame: Loaded data
    """

    try:
        df = pd.read_excel(file_path)
        return df

    except Exception as e:
        raise RuntimeError(f"Failed to read Excel file: {e}")


# -------------------------------------------------
# Function: clean_dataframe
# -------------------------------------------------
def clean_dataframe(df):
    """
    Sort and deduplicate the DataFrame.

    Processing Steps:
    1. Sort rows so Execute == 'Y' appears first.
    2. Drop duplicates based on base_url column.
    3. Keep the first occurrence (preferred row).

    Args:
        df (pandas.DataFrame): Raw input DataFrame

    Returns:
        pandas.DataFrame: Cleaned DataFrame
    """

    # Ensure required columns exist
    required_columns = ["Execute", "base_url"]

    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    # -------------------------------------------------
    # Step 1: Sort Data
    # -------------------------------------------------
    # Sort so that rows with Execute == 'Y' appear first
    # ascending=False means 'Y' comes before 'N'
    df_sorted = df.sort_values(
        by="Execute",
        ascending=False
    )

    # -------------------------------------------------
    # Step 2: Remove Duplicates
    # -------------------------------------------------
    # Remove duplicate base_url values
    # keep='first' keeps the first row after sorting
    df_clean = df_sorted.drop_duplicates(
        subset="base_url",
        keep="first"
    )

    return df_clean


# -------------------------------------------------
# Function: save_excel_file
# -------------------------------------------------
def save_excel_file(df, output_path):
    """
    Save DataFrame to an Excel file.

    Args:
        df (pandas.DataFrame): Cleaned data
        output_path (str): Output Excel file path
    """

    try:
        df.to_excel(output_path, index=False)

    except Exception as e:
        raise RuntimeError(f"Failed to write Excel file: {e}")


# -------------------------------------------------
# Main Function
# -------------------------------------------------
def main():
    """
    Main entry point for script execution.
    """

    # Parse command-line arguments
    args = parse_arguments()

    input_file = args.input_file

    try:
        # Validate input file
        validate_input_file(input_file)

        # Load Excel file into DataFrame
        df = load_excel_file(input_file)

        # Clean and deduplicate data
        df_clean = clean_dataframe(df)

        # Generate output file path in artifacts directory
        output_file = generate_output_path(input_file)

        # Save cleaned data
        save_excel_file(df_clean, output_file)

        # Logging / Summary
        print("Input file :", input_file)
        print("Output file:", output_file)
        print("Original rows:", len(df))
        print("Cleaned rows :", len(df_clean))
        print("Duplicates removed:", len(df) - len(df_clean))
        print("Processing completed successfully.")

    except Exception as e:
        # Display error and exit with failure code
        print("Error:", str(e))
        sys.exit(1)


# -------------------------------------------------
# Script Entry Point
# -------------------------------------------------
if __name__ == "__main__":
    main()


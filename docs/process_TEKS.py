import json
import os
import re

# Configuration
INPUT_FILE = 'MiddleSchoolMathTEKS-a9fd9c56.json'
OUTPUT_DIR = 'bedrock_knowledge_base'

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def clean_teks_data():
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    current_grade = "Unknown"
    
    for i, element in enumerate(data):
        text = element.get("text", "")
        
        # 1. Identify Grade Level (e.g., "Grade 7")
        grade_match = re.search(r'Grade (\d)', text)
        if grade_match:
            current_grade = grade_match.group(1)
            continue

        # 2. Identify Specific TEKS Codes (e.g., "7.4(A)" or "(4) Proportionality")
        # This regex looks for the common TEKS numbering format
        teks_id_match = re.match(r'\((\d+)\)\s*(.*)', text)
        
        if teks_id_match:
            teks_num = teks_id_match.group(1)
            teks_title = teks_id_match.group(2)
            
            # Construct a unique filename
            safe_title = "".join([c for c in teks_title if c.isalnum()]).rstrip()[:20]
            base_name = f"grade_{current_grade}_std_{teks_num}_{safe_title}"
            
            # --- CREATE THE CONTENT FILE (.txt) ---
            content_text = f"TEKS Standard: Grade {current_grade}, Section {teks_num}\n"
            content_text += f"Title: {teks_title}\n"
            content_text += f"Description: {text}"

            # Append following student-expectation bullets (A), (B), ... until next numbered (N) strand
            j = i + 1
            while j < len(data):
                nxt = data[j].get("text", "")
                if re.match(r"^\(\d+\)\s", nxt):
                    break
                if re.match(r"^§111\.\d+", nxt) or nxt.startswith("Source:"):
                    break
                if re.match(r"^\([A-Z]\)\s", nxt):
                    content_text += "\n" + nxt
                j += 1
            
            with open(f"{OUTPUT_DIR}/{base_name}.txt", "w") as f_out:
                f_out.write(content_text)

            # --- CREATE THE METADATA FILE (.json) ---
            # AWS Bedrock looks for [filename].txt.metadata.json
            metadata = {
                "metadataAttributes": {
                    "grade_level": current_grade,
                    "teks_section": teks_num,
                    "subject": "Mathematics",
                    "organization": "Texas Education Agency",
                    "tutor_alignment": "Start Right Tutoring"
                }
            }
            
            with open(f"{OUTPUT_DIR}/{base_name}.txt.metadata.json", "w") as f_meta:
                json.dump(metadata, f_meta, indent=4)

    print(f"✅ Success! Bedrock files generated in ./{OUTPUT_DIR}/")

if __name__ == "__main__":
    clean_teks_data()
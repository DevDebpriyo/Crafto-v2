import re

with open('/home/koushik/Desktop/celo/sello/backend/app/services/product_pipeline.py', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
remesh_code = []

# Extract the run_remesh_pipeline code
capture = False
for line in lines:
    if "def run_remesh_pipeline" in line:
        capture = True
    
    if capture:
        remesh_code.append(line)
        if "logger.exception(\"[product-pipeline] Exception in remesh:" in line:
            # We also need the self.fail_pipeline line
            capture_next = True
        elif capture and "self.fail_pipeline(f\"Failed to remesh: {str(exc)}\")" in line:
            capture = False
            # also capture the empty lines after if any, we'll manually insert it anyway

# Remove the incorrectly placed remesh code and `product_pipeline_service = ...` if it's jumbled
cleaned_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    if "def run_remesh_pipeline" in line:
        # Skip until the end of the method
        while i < len(lines) and not "self.fail_pipeline(f\"Failed to remesh: {str(exc)}\")" in lines[i]:
            i += 1
        i += 1
        continue
    if "product_pipeline_service = ProductPipelineService()" in line:
        i += 1
        continue
    cleaned_lines.append(line)
    i += 1

# Re-insert before the end of the file/class
# The class probably ends right before we see what was there
# We'll put it back before we instantiate product_pipeline_service

full_text = "".join(cleaned_lines)
remesh_text = "".join(remesh_code)

final_text = full_text + "\n" + remesh_text + "\n\nproduct_pipeline_service = ProductPipelineService()\n"

with open('/home/koushik/Desktop/celo/sello/backend/app/services/product_pipeline.py', 'w') as f:
    f.write(final_text)

print("Fixed indentation")

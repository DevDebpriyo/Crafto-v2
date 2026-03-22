import re

with open('/home/koushik/Desktop/celo/sello/backend/app/services/product_pipeline.py', 'r') as f:
    text = f.read()

# Replace self.fail_pipeline with inline error handling logic
replacement = """            state = get_product_state()
            state.mark_error(str(exc))
            save_product_state(state)
            self._update_status(
                ProductStatus(
                    status="error",
                    progress=0,
                    message="Remesh failed",
                    error=str(exc)
                )
            )"""

text = text.replace('            self.fail_pipeline("No model available to remesh.")', replacement.replace('str(exc)', '"No model available to remesh."'))
text = text.replace('            self.fail_pipeline(f"Failed to remesh: {str(exc)}")', replacement)

with open('/home/koushik/Desktop/celo/sello/backend/app/services/product_pipeline.py', 'w') as f:
    f.write(text)


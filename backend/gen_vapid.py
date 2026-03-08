import os
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization

# Generate EC private key
private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())

# Get private numbers (as scalar bytes)
private_numbers = private_key.private_numbers()
priv_bytes = private_numbers.private_value.to_bytes(32, 'big')
priv_b64 = base64.urlsafe_b64encode(priv_bytes).decode('ascii').strip('=')

# Get public key in uncompressed form
public_key = private_key.public_key()
public_numbers = public_key.public_numbers()
pub_bytes = b'\x04' + public_numbers.x.to_bytes(32, 'big') + public_numbers.y.to_bytes(32, 'big')
pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode('ascii').strip('=')

with open('.env', 'a') as f:
    f.write(f"\nVAPID_PRIVATE_KEY={priv_b64}\n")
    f.write(f"VAPID_PUBLIC_KEY={pub_b64}\n")
    f.write("VAPID_CLAIMS_EMAIL=mailto:dheena@example.com\n")

print("VAPID Keys generated and added to .env successfully.")

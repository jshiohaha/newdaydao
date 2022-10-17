# ------- copy IDL and types
# IDL to app
cp ./target/idl/auction_factory.json ./app/public/

# ------- types to SDK
cp -r target/types ./sdk/src/types/

echo IDLs and Types copied ✅
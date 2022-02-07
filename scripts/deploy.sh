if [ $# -gt 1 ]; then
    echo "Cluster name is the only optional accepted parameter: devnet, mainnet-beta"
    exit 1
fi

network='devnet' # set default if param not specified
if [ $# -ne 0 ]; then
    if [ "$1" = devnet ]; then
        network='devnet'
     elif [ "$1" = mainnet-beta ]; then
        network='mainnet-beta'
    else
        echo "devnet, mainnet-beta are the only acceptable cluster names"
        exit 1
    fi
fi

echo "Deplying to $network";

# fetch old pk
old_auction_factory_pk=`solana-keygen pubkey ./target/deploy/auction_factory-keypair.json`
echo OLD AF PK: $old_auction_factory_pk

# stash old keypair
cd ./target/deploy #need to cd for renaming to work ok
mv auction_factory-keypair.json auction_factory-keypair-`ls | wc -l | xargs`.json
cd ./../..

# build and fetch new pk
anchor build
new_auction_factory_pk=`solana-keygen pubkey ./target/deploy/auction_factory-keypair.json`
echo BUILT, NEW AF PK: $new_auction_factory_pk

sed -i'.original' -e "s/$old_auction_factory_pk/$new_auction_factory_pk/g" ./Anchor.toml
sed -i'.original' -e "s/$old_auction_factory_pk/$new_auction_factory_pk/g" ./programs/auction-factory/src/lib.rs
sed -i'.original' -e "s/$old_auction_factory_pk/$new_auction_factory_pk/g" ./programs/auction-factory/src/constant.rs
sed -i'.original' -e "s/$old_auction_factory_pk/$new_auction_factory_pk/g" ./sdk/src/common/constant.ts
# replace in other files as well. maybe grep & grab files so we don't have to manually update this?
echo AF REPLACED!

# build again with new pk
anchor build

# copy idl
cp ./target/idl/auction_factory.json ./app/public/

# deploy!
solana balance # enough lamports left for deployment?
# anchor deploy --provider.cluster devnet
# echo DEPLOYED TO DEVNET
# solana balance
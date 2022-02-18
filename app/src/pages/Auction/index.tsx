import AuctionDisplay from "../../components/AuctionDisplay";

import "./Auction.css";

export const AuctionPage = () => {
    // const client = new AuctionFactoryClient(
    //     connection.connection,
    //     wallet as any,
    //     undefined,
    //     undefined
    // );

    // const loadAuctionFactory = async () => {
    //     const fetchedAuctionFactory = await fetchAuctionFactoryAccountFake(
    //         program,
    //         AUTHORITY_PUBLIC_KEY
    //     );

    //     setAuctionFactory(fetchedAuctionFactory);
    // };

    // const loadCurrentAuction = async () => {
    //     if (auctionFactory !== undefined) {
    //         const fetchedAuction = await fetchAuctionAccountFake(
    //             program,
    //             auctionFactory.sequence,
    //             auctionFactory.authority
    //         );

    //         setAuction(fetchedAuction);
    //     }
    // };

    // useEffect(() => {
    //     loadAuctionFactory()
    //         .catch(err => console.log(err));
    // }, []);

    // useEffect(() => {
    //     loadCurrentAuction()
    //         .catch(err => console.log(err));
    // }, [auctionFactory]);

    return (
        <>
            <div className="content--container">
                {/* fix possibly undefined */}
                <AuctionDisplay />
            </div>
        </>
    );
};

export default AuctionPage;

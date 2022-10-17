import { useCallback, useMemo } from "react";
import {
    BrowserRouter,
    Routes, // instead of "Switch"
    Route,
} from "react-router-dom";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
    getLedgerWallet,
    getPhantomWallet,
    getSlopeWallet,
    getSolflareWallet,
    getSolletExtensionWallet,
    getSolletWallet,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import toast, { Toaster } from "react-hot-toast";

import { AuctionFactoryProvider } from './contexts/AuctionFactoryProvider';
import NavigationBar from "./components/NavigationBar/index";
import AuctionPage from "./pages/Auction/index";

const recipient = new PublicKey("Hi4oRso4258Ex8mc6aWWuG89DDh11wKXeosWQHHuWeEF");

const App = () => {
    // meh, but i think this is ok since we don't really want uses switching network config on the fly.
    const network = WalletAdapterNetwork.Devnet;
    const connectWallet = false;
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    // If you're testing without a phone, set this to true to allow a browser-based wallet connection to be used
    const wallets = useMemo(
        () => [
            getPhantomWallet(),
            getSolflareWallet(),
            getSolletWallet({ network }),
            getSolletExtensionWallet({ network }),
            getLedgerWallet(),
            getSlopeWallet(),
        ],
        [connectWallet, network]
    );

    const onError = useCallback(
        (walletError: WalletError) =>
            toast(walletError.message, {
                icon: "🧨",
            }),
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} onError={onError} autoConnect>
                <WalletModalProvider>
                    <BrowserRouter>
                        <AuctionFactoryProvider>
                            <NavigationBar />
                            <Routes>
                                <Route path="/" element={<AuctionPage />}></Route>
                            </Routes>
                        </AuctionFactoryProvider>
                    </BrowserRouter>
                </WalletModalProvider>
                <Toaster position="bottom-left" reverseOrder={false} />
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;

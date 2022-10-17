import { useWallet } from "@solana/wallet-adapter-react";
import {
    WalletDisconnectButton,
    WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { toDisplayString } from "../../utils/address";

import logo from "../../assets/images/logo.png";
import "./NavigationBar.css";

const NavigationBar = () => {
    let wallet = useWallet();

    let connectStyle = {
        justifyContent: "center",
        color: "#FFF",
        backgroundColor: "#000",
        border: "0px solid rgb(0, 0, 0)",
        fontSize: "14px",
        fontWeight: 500,
        margin: "2rem",
        height: "40px",
    };

    return (
        <nav className="navbar">
            <img className="logo" src={logo} />

            <div className="right--navbar--display">
                {!wallet.connected ? (
                    <WalletMultiButton
                        className="connect--wallet--button"
                        style={connectStyle}
                    />
                ) : (
                    <>
                        <div className="wallet--address--container">
                            <span className="connected--circle"></span>
                            <div>{toDisplayString(wallet.publicKey!)}</div>
                        </div>

                        <WalletDisconnectButton
                            style={connectStyle}
                            className="nav-wallet-button disconnect"
                        />
                    </>
                )}
            </div>
        </nav>
    );
};

export default NavigationBar;
import { WalletContextState } from "@solana/wallet-adapter-react";
import * as web3 from "@solana/web3.js";
import BN from "bn.js";
import toast from "react-hot-toast";

export const sleep = (time: number) => {
    return new Promise((resolve) => setTimeout(resolve, time));
}

export const getNow = (truncate?: boolean) => {
    const time = new Date().getTime();
    return Math.round(truncate ? time / 1000 : time);
};

export const timeSince = (date: number) => {
    const now = new Date().getTime() / 1000;
    var seconds = Math.floor(now - date);
    return stringInterval(seconds);
};

export const stringInterval = (seconds: number) => {
    var interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "yr";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "hr";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "just now";
};

export const tokenLink = (toPubkey: web3.PublicKey) => {
    //https://explorer.solana.com/address/Fs95oxtjcUdVqo6Zg1JJZ8orq3eGF8qF8cxdKeunD7U1?cluster=devnet
    return `https://solscan.io/token/${toPubkey.toBase58()}?cluster=devnet`;
};

export const establishedTextFor = (date: Date) => {
    let month = getMonth(date.getMonth());
    return "est. " + month + " " + date.getDate() + ", " + date.getFullYear();
};

export const endedTextFor = (date: Date) => {
    let month = getMonth(date.getMonth());
    return "ended " + month + " " + date.getDate() + ", " + date.getFullYear();
};

export const getFormattedDate = (date: Date) => {
    let month = getMonth(date.getMonth(), false);
    return month + " " + date.getDate() + ", " + date.getFullYear();
};

export const getMonth = (number: number, abbreviated: boolean = true) => {
    if (number === 0) {
        return abbreviated ? "Jan" : "January";
    } else if (number === 1) {
        return abbreviated ? "Feb" : "February";
    } else if (number === 2) {
        return abbreviated ? "Mar" : "March";
    } else if (number === 3) {
        return abbreviated ? "Apr" : "April";
    } else if (number === 4) {
        return abbreviated ? "May" : "May";
    } else if (number === 5) {
        return abbreviated ? "Jun" : "June";
    } else if (number === 6) {
        return abbreviated ? "Jul" : "July";
    } else if (number === 7) {
        return abbreviated ? "Aug" : "August";
    } else if (number === 8) {
        return abbreviated ? "Sep" : "September";
    } else if (number === 9) {
        return abbreviated ? "Oct" : "October";
    } else if (number === 10) {
        return abbreviated ? "Nov" : "November";
    } else if (number === 11) {
        return abbreviated ? "Dec" : "December";
    }
    return "";
};

export const walletIsConnected = (wallet: WalletContextState) => {
    return wallet.publicKey !== null;
}

export const toDateSubString = (d: Date) => {
    const month = getMonth(d.getMonth());
    const day = d.getDate();
    const hour = d.getHours();
    const min = d.getMinutes();
    var ampm = (hour >= 12) ? "PM" : "AM";

    const _hour = (hour >= 12)
        ? hour === 0 || hour === 12 ? 12 : hour - 12 // handle noon and midnight
        : hour;
    const _min = min < 10 ? min.toString().padStart(2, '0') : min.toString();

    console.log(`hour ${hour} -> _hour ${_hour}`);
    console.log(`min ${min} -> _min ${_min}`);

    return `${month} ${day} at ${_hour}:${_min} ${ampm}`;
}

export const timestampToDateString = (timestamp: BN | number) => {
    const _timestamp = typeof timestamp === 'number' ? timestamp : timestamp.toNumber() * 1000;
    console.log('date: ', new Date(_timestamp).toString());
    return toDateSubString(new Date(_timestamp));
}

export const publishToastMessage = (msg: string): void => {
    if (!msg.includes("User rejected the request")) {
        toast(msg, {
            icon: "🧨",
        });
    }
}
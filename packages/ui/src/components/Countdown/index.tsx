import { useState, useEffect } from "react";

import { timestampToDateString } from "../../utils/util";
import "./Countdown.css";

export interface Countdown {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

export interface CountdownProps {
    endTime: number | undefined;
}

const Countdown = (props: CountdownProps) => {
    const { endTime } = props;

    const calculateTimeLeft = (end: number) => {
        // todo: how many digits? => endTime
        // calculate offset between endTime and currentTimestamp
        const difference = (end - new Date().getTime()) / 1000;
        if (difference > 0) {
            return {
                days: Math.floor(difference / (60 * 60 * 24)),
                hours: Math.floor((difference / (60 * 60)) % 24),
                minutes: Math.floor((difference / 60) % 60),
                seconds: Math.floor(difference % 60),
            };
        }

        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        };
    };

    const [timerToggle, setTimerToggle] = useState(true);
    // todo: figure out how many decimals are passed in & update end time accordingly
    const [endTimeDate, setEndTime] = useState(
        endTime ? new Date(endTime * 1000) : undefined
    );
    const [timeLeft, setTimeLeft] = useState<Countdown>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    const isAuctionEnded = () => {
        return endTimeDate && endTimeDate.getTime() <= new Date().getTime();
    };

    useEffect(() => {
        if (!endTime) return;

        const timer = setInterval(() => {
            const _endTimeInMs = (endTime ? endTime : 0) * 1000;
            setEndTime(new Date(_endTimeInMs));
            setTimeLeft(calculateTimeLeft(_endTimeInMs));
        }, 1000);

        return () => clearTimeout(timer);
    }, [endTime]);

    // todo: fix month calculation... seems broken in jan/feb case
    const auctionContent = isAuctionEnded()
        ? "Auction ended"
        : timerToggle
        ? "Ends in"
        : "Ends on";

    return (
        <>
            {endTimeDate && (
                <div
                    onClick={() => setTimerToggle(!timerToggle)}
                    className={`auction--timer--section ${isAuctionEnded() && 'timer--click--disabled'}`}
                >
                    <p className="title">{auctionContent}</p>
                    {timerToggle && !isAuctionEnded() ? (
                        <h2 className="timer-wrapper">
                            {timeLeft.days > 0 && (
                                <div className="timer--section">
                                    <span>
                                        {`${Math.floor(timeLeft.days)}`}
                                        <span className="small">d</span>
                                    </span>
                                </div>
                            )}
                            <div className="timer--section">
                                <span>
                                    {`${Math.floor(timeLeft.hours)}`}
                                    <span className="small">h</span>
                                </span>
                            </div>
                            <div className="timer--section">
                                <span>
                                    {`${timeLeft.minutes}`}
                                    <span className="small">m</span>
                                </span>
                            </div>
                            <div className="timer--section">
                                <span>
                                    {`${timeLeft.seconds}`}
                                    <span className="small">s</span>
                                </span>
                            </div>
                        </h2>
                    ) : endTime && <span className="auction--ended--text">{timestampToDateString(endTimeDate.getTime())}</span>}
                </div>
            )}
        </>
    );
};

export default Countdown;

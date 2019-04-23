exports.seatOccupied = function(seatMask, seatNumber){
    return (seatMask & (1 << (seatNumber-1))) != 0;
}


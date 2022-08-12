exports.handleError = (res, error) => {
    if(typeof error == 'string') return res.status(400).json({message : error});
    if(error.message){
        return res.status(400).json({message : error});
    }

    return res.status(400).json({message : "Oops, we encountered an error..."});
}
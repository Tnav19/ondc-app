import { makeStyles } from '@mui/styles';
import palette from "../../../utils/Theme/palette";

const useStyles = makeStyles({
    subCatContainerMain: {
        padding: '32px 54px 16px 54px',
        // marginTop: '32px !important',
        overflow: 'hidden'
    },
    subCatContainer: {
        display: 'flex',
        gap: '25px',
        // overflow: 'auto',
        paddingBottom: '10px',
        // '&::-webkit-scrollbar': {
        //     // display: 'none',
        //     height: '8px',
        //     scrollbarColor: `${palette.primary.main} !important`
        // },
        // '&::-webkit-scrollbar-thumb': {
        //     background: `${palette.primary.main} !important`
        // },

    },
    paginationActionContainer:{
        display: 'flex',
        gap: '25px',
    },
    subCatCard: {
        cursor: 'pointer',
        height: '120px !important',
        width: '120px !important',
        minWidth: '120px !important',
        borderRadius: '24.5px !important',
        background:'#F5F5F5 !important',
        display: 'flex',
        boxShadow: "none !important",
    },
    subCatImage: {
        margin: 'auto',
        height: '120px !important',
        width: '120px !important',
    },
    subCatNameTypo: {
        fontWeight: '550 !important',
        marginTop: '13px !important',
        textAlign: 'center',
        paddingLeft: '10px',
        paddingRight: '10px',
    },
    dotsContainer: {
        textAlign: 'center'
    },
    dot: {
        height: '10px',
        width: '10px',
        backgroundColor: '#D9D9D9',
        borderRadius: '50%',
        display: 'inline-block',
        marginLeft: '5px'
    },
    selectedDot: {
        height: '10px',
        width: '20px',
        backgroundColor: palette.primary.main,
        borderRadius: '10px',
        display: 'inline-block',
        marginLeft: '5px'
    },
    categoriesContainer: {
        "& ul": {
            overflow: 'auto',
            display: 'flex',
            gap: '10px',
            // padding: '16px !important',
            justifyContent: 'center',
            "& li:has(.MuiPaginationItem-ellipsis)": {
                background: 'red !important',
                display: 'none'
            }
        },
        textAlign: 'center',
        margin: 'auto'
    },
    isActive: {
        border: `2px solid ${palette.primary.main}`
    }
});

export default useStyles;
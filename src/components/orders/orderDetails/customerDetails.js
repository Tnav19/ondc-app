import React from "react";
import useStyles from "./style";

import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

import { ReactComponent as CallIcon } from "../../../assets/images/callBrand.svg";
import moment from "moment/moment";

const CustomerDetails = ({ orderDetails }) => {
  const classes = useStyles();
  const customerDetails = {
    id: "1",
    name: "Rohit Singh",
    mobile: "+91 7082222724",
    date: "30/04/23 at 4:30pm",
    orderNumber: "92728282",
    paymentMode: "Cash",
    deliveryAddress: "1333 Evesham Road Astwood Bank New Delhi B96 6AY India",
  };

  const fetchAddress = (address) => {
    const { locality, building, city, state, country, areaCode } = address;
    let addressString = "";
    addressString = `${locality ? `${locality}` : ""} ${building ? `,${building}` : ""} ${city ? `,${city}` : ""} ${
      state ? `,${state}` : ""
    } ${country ? `,${country}` : ""} - ${areaCode}`;
    return addressString;
  };

  return (
    <Grid container spacing={3} columns={10}>
      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
        <Typography variant="h4" className={classes.customerDetailsTypo}>
          Customer Details
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={2} lg={2} xl={2}>
        <Typography component="div" variant="body" className={classes.customerDetailsLabel}>
          Order Number
        </Typography>
        <Typography component="div" variant="body" className={classes.customerDetailsValue}>
          {orderDetails?.id}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={8} lg={8} xl={8}>
        <Typography component="div" variant="body" className={classes.customerDetailsLabel}>
          Payment mode
        </Typography>
        <Typography component="div" variant="body" className={classes.customerDetailsValue}>
          {orderDetails?.payment?.type === "ON-FULFILLMENT" ? "Cash on delivery" : "Prepaid"}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={2} lg={2} xl={2}>
        <Typography component="div" variant="body" className={classes.customerDetailsLabel}>
          Customer Name
        </Typography>
        <Typography component="div" variant="body" className={classes.customerDetailsValue}>
          {orderDetails?.billing?.name}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={2} lg={2} xl={2}>
        <Typography component="div" variant="body" className={classes.customerDetailsLabel}>
          Phone Number
        </Typography>
        <Typography component="div" variant="body" className={classes.customerDetailsValue}>
          {orderDetails?.billing?.phone}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
        <Typography component="div" variant="body" className={classes.customerDetailsLabel}>
          Date
        </Typography>
        <Typography component="div" variant="body" className={classes.customerDetailsValue}>
          {`${moment(orderDetails?.createdAt).format("DD/MM/yy")} at ${moment(orderDetails?.createdAt).format(
            "hh:mma"
          )}`}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
        <Typography component="div" variant="body" className={classes.customerDetailsLabel}>
          Delivered To
        </Typography>
        <Typography component="div" variant="body" className={classes.customerDetailsValue}>
          {orderDetails?.billing?.address ? fetchAddress(orderDetails?.billing?.address) : ""}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
        <Button
          target="_blank"
          variant="outlined"
          className={classes.downloadInvoiceButton}
          onClick={() => console.log(orderDetails.documents)}
          href={`${orderDetails?.documents?.[0]?.url}`}
          disabled={orderDetails?.documents == undefined}
        >
          Download Invoice
        </Button>
        <Button variant="outlined" startIcon={<CallIcon />}>
          {`Call ${orderDetails?.provider?.descriptor?.name}`}
        </Button>
      </Grid>
    </Grid>
  );
};

export default CustomerDetails;

import React, { useContext, useEffect, useRef, useState } from "react";
import useStyles from "./styles";
import { useHistory, Link } from "react-router-dom";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Drawer,
  FormGroup,
  Grid,
  TextField,
  Typography,
  styled,
} from "@mui/material";
import { deleteCall, getCall, postCall, putCall } from "../../../api/axios";
import { AddCookie, getValueFromCookie } from "../../../utils/cookies";
import Loading from "../../shared/loading/loading";
import { constructQouteObject } from "../../../api/utils/constructRequestObject";
import useCancellablePromise from "../../../api/cancelRequest";
import { SSE_TIMEOUT } from "../../../constants/sse-waiting-time";
import { v4 as uuidv4 } from "uuid";
import { AddressContext } from "../../../context/addressContext";
import { CartContext } from "../../../context/cartContext";
import EditCustomizations from "./EditCustomizations";
import { ToastContext } from "../../../context/toastContext";
import { toast_actions, toast_types } from "../../shared/toast/utils/toast";
import { SearchContext } from "../../../context/searchContext";
import { CheckBox, OfflineShareRounded } from "@mui/icons-material";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import { getAllOffersRequest } from "../../../api/offer.api";
import OfferCard from "../../common/Offers/OfferCard";

export default function Cart({ showOnlyItems = false, setCheckoutCartItems }) {
  let user = {};
  const userCookie = getValueFromCookie("user");

  if (userCookie) {
    try {
      user = JSON.parse(userCookie);
    } catch (error) {
      console.log("Error parsing user cookie:", error);
    }
  }

  const classes = useStyles();
  const history = useHistory();
  const dispatch = useContext(ToastContext);
  const { deliveryAddress } = useContext(AddressContext);
  const { fetchCartItems } = useContext(CartContext);
  const { locationData: deliveryAddressLocation } = useContext(SearchContext);

  const { cancellablePromise } = useCancellablePromise();
  const transaction_id = localStorage.getItem("transaction_id");

  const responseRef = useRef([]);
  const eventTimeOutRef = useRef([]);
  const updatedCartItems = useRef([]);
  const [getQuoteLoading, setGetQuoteLoading] = useState(true);
  const [toggleInit, setToggleInit] = useState(false);
  const [eventData, setEventData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [offers, setOffers] = useState([]);
  const [haveDistinctProviders, setHaveDistinctProviders] = useState(false);
  const [errorMessageTimeOut, setErrorMessageTimeOut] = useState(
    "Fetching details for this product"
  );

  const [openDrawer, setOpenDrawer] = useState(false);
  const [productPayload, setProductPayload] = useState(null);
  const [customization_state, setCustomizationState] = useState({});
  const [productLoading, setProductLoading] = useState(false);
  const [currentCartItem, setCurrentCartItem] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [
    isProductAvailableQuantityIsZero,
    setIsProductAvailableQuantityIsZero,
  ] = useState(false);
  const [isProductCategoryIsDifferent, setIsProductCategoryIsDifferent] =
    useState(false);

  const [selectedNonAdditiveOffer, setSelectedNonAdditiveOffer] = useState("");
  const [selectedAdditiveOffers, setSelectedAdditiveOffers] = useState([]);

  const getCartSubtotal = () => {
    let subtotal = 0;
    cartItems.map((cartItem) => {
      if (cartItem.item.hasCustomisations) {
        subtotal +=
          getPriceWithCustomisations(cartItem) *
          cartItem?.item?.quantity?.count;
      } else {
        subtotal +=
          cartItem?.item?.product?.subtotal * cartItem?.item?.quantity?.count;
      }
    });
    return subtotal;
  };

  const checkDistinctProviders = () => {
    if (cartItems.length < 2) {
      setHaveDistinctProviders(false);
    } else {
      const firstProvider = cartItems[0].item.provider.id;
      let haveDifferentProvider = false;

      for (let i = 1; i < cartItems.length; i++) {
        if (cartItems[i].item.provider.id !== firstProvider) {
          haveDifferentProvider = true;
          break;
        }
      }

      setHaveDistinctProviders(haveDifferentProvider);
    }
  };

  const getCartItems = async () => {
    try {
      setLoading(true);
      const url = `/clientApis/v2/cart/${user.id}`;
      const res = await getCall(url);
      setCartItems(res);
      updatedCartItems.current = res;
      if (setCheckoutCartItems) {
        setCheckoutCartItems(res);
      }
    } catch (error) {
      console.log("Error fetching cart items:", error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // function to dispatch error
  function dispatchError(message) {
    dispatch({
      type: toast_actions.ADD_TOAST,
      payload: {
        id: Math.floor(Math.random() * 100),
        type: toast_types.error,
        message,
      },
    });
  }

  const updateCartItem = async (itemId, increment, uniqueId) => {
    const url = `/clientApis/v2/cart/${user.id}/${uniqueId}`;
    const items = cartItems.concat([]);
    const itemIndex = items.findIndex((item) => item._id === uniqueId);
    if (itemIndex !== -1) {
      let updatedCartItem = items[itemIndex];
      updatedCartItem.id = updatedCartItem.item.id;

      if (increment !== null) {
        if (increment) {
          const productMaxQuantity =
            updatedCartItem?.item?.product?.quantity?.maximum;
          if (productMaxQuantity) {
            if (
              updatedCartItem.item.quantity.count < productMaxQuantity.count
            ) {
              updatedCartItem.item.quantity.count += 1;

              let customisations = updatedCartItem.item.customisations;

              if (customisations) {
                customisations = customisations.map((c) => {
                  return {
                    ...c,
                    quantity: { ...c.quantity, count: c.quantity.count + 1 },
                  };
                });

                updatedCartItem.item.customisations = customisations;
              } else {
                updatedCartItem.item.customisations = null;
              }

              updatedCartItem = updatedCartItem.item;

              const res = await putCall(url, updatedCartItem);
              setLoading(false);
              getCartItems();
              fetchCartItems();
            } else {
              dispatchError(
                `Maximum allowed quantity is ${updatedCartItem.item.quantity.count}`
              );
            }
          } else {
            updatedCartItem.item.quantity.count += 1;
            updatedCartItem = updatedCartItem.item;
            const res = await putCall(url, updatedCartItem);
            setLoading(false);
            getCartItems();
            fetchCartItems();
          }
        } else {
          if (updatedCartItem.item.quantity.count > 1) {
            updatedCartItem.item.quantity.count -= 1;

            let customisations = updatedCartItem.item.customisations;

            if (customisations) {
              customisations = customisations.map((c) => {
                return {
                  ...c,
                  quantity: { ...c.quantity, count: c.quantity.count - 1 },
                };
              });
              updatedCartItem.item.customisations = customisations;
            } else {
              updatedCartItem.item.customisations = null;
            }

            updatedCartItem = updatedCartItem.item;
            const res = await putCall(url, updatedCartItem);
            setLoading(false);
            getCartItems();
            fetchCartItems();
          }
        }
      }
    }
  };

  const deleteCartItem = async (itemId) => {
    const url = `/clientApis/v2/cart/${user.id}/${itemId}`;
    const res = await deleteCall(url);
    getCartItems();
    fetchCartItems();
  };

  //   const getProductDetails = async (productId) => {
  //     try {
  //       setProductLoading(true);
  //       const data = await cancellablePromise(getCall(`/clientApis/v2/items/${productId}`));
  //       setProductPayload(data.response);
  //       return data.response;
  //     } catch (error) {
  //       console.error("Error fetching product details:", error);
  //     } finally {
  //       setProductLoading(false);
  //     }
  //   };

  const getProductDetails = async (productId) => {
    try {
      setProductLoading(true);
      const data = await cancellablePromise(
        getCall(`/clientApis/v2/item-details?id=${productId}`)
      );
      setProductPayload(data);
      return data;
    } catch (error) {
      console.error("Error fetching product details:", error);
    } finally {
      setProductLoading(false);
    }
  };

  const getAllOffers = async () => {
    // setIsLoading(true);
    try {
      const latLongInfo = JSON.parse(getValueFromCookie("LatLongInfo"));
      console.log("LAT", latLongInfo);
      const lat = latLongInfo.lat;
      const lng = latLongInfo.lng;
      const provider_id = cartItems[0].item.provider.id;
      console.log(cartItems[0].item.provider);
      const data = await cancellablePromise(
        getAllOffersRequest("", lat, lng, provider_id)
      );

      setOffers(data);
    } catch (err) {
      dispatch({
        type: toast_actions.ADD_TOAST,
        payload: {
          id: Math.floor(Math.random() * 100),
          type: toast_types.error,
          message: err?.response?.data?.error?.message,
        },
      });
    } finally {
      // setIsLoading(false);
    }
  };

  useEffect(() => {
    getCartItems();
  }, [openDrawer]);

  const checkAvailableQuantity = () => {
    let quantityIsZero = false;
    cartItems.forEach((item) => {
      const availableQuantity = item?.item?.product?.quantity?.available;
      if (availableQuantity && availableQuantity?.count === 0) {
        quantityIsZero = true;
      }
    });
    setIsProductAvailableQuantityIsZero(quantityIsZero);
  };

  const checkDifferentCategory = () => {
    const everyEnvHasSameValue = cartItems.every(
      ({ item }) => item.domain === cartItems[0].item.domain
    ); // use proper name
    setIsProductCategoryIsDifferent(!everyEnvHasSameValue);
  };

  useEffect(() => {
    checkDistinctProviders();
    checkAvailableQuantity();
    checkDifferentCategory();
  }, [cartItems.length, deliveryAddressLocation]);

  const isValidCart = () => {
    // console.log("*", isProductAvailableQuantityIsZero);
    // console.log("**", isProductCategoryIsDifferent);
    // console.log("***, ", haveDistinctProviders);
    // console.log("****", checkoutLoading);
    return !(
      isProductAvailableQuantityIsZero ||
      isProductCategoryIsDifferent ||
      haveDistinctProviders ||
      checkoutLoading
    );
  };

  const offers_dummy_data = [
    {
      id: "DISCP60",
      descriptor: {
        code: "discount",
        images: ["https://sellerNP.com/images/offer2-banner.png"],
      },
      location_ids: ["L1"],
      item_ids: ["I1"],
      time: {
        label: "valid",
        range: {
          start: "2023-06-21T16:00:00.000Z",
          end: "2023-06-21T23:00:00.000Z",
        },
      },
      tags: [
        {
          code: "qualifier",
          list: [
            {
              code: "min_value",
              value: "159.00",
            },
          ],
        },
        {
          code: "benefit",
          list: [
            {
              code: "value_type",
              value: "percent",
            },
            {
              code: "value",
              value: "-60.00",
            },
            {
              code: "value_cap",
              value: "-120.00",
            },
          ],
        },
        {
          code: "meta",
          list: [
            {
              code: "additive",
              value: "yes",
            },
            {
              code: "auto",
              value: "yes",
            },
          ],
        },
      ],
    },
    {
      id: "FLAT150",
      descriptor: {
        code: "discount",
        images: ["https://sellerNP.com/images/offer2-banner.png"],
      },
      location_ids: ["L1"],
      item_ids: ["I1"],
      time: {
        label: "valid",
        range: {
          start: "2023-06-22T16:00:00.000Z",
          end: "2023-06-22T23:00:00.000Z",
        },
      },
      tags: [
        {
          code: "qualifier",
          list: [
            {
              code: "min_value",
              value: "499.00",
            },
          ],
        },
        {
          code: "benefit",
          list: [
            {
              code: "value_type",
              value: "amount",
            },
            {
              code: "value",
              value: "-150.00",
            },
          ],
        },
        {
          code: "meta",
          list: [
            {
              code: "additive",
              value: "yes",
            },
            {
              code: "auto",
              value: "yes",
            },
          ],
        },
      ],
    },
    {
      id: "BUY2GET3",
      descriptor: {
        code: "buyXgetY",
        images: ["https://sellerNP.com/images/offer1-banner.png"],
      },
      location_ids: ["L1"],
      item_ids: ["I1"],
      time: {
        label: "valid",
        range: {
          start: "2023-06-23T16:00:00.000Z",
          end: "2023-06-23T23:00:00.000Z",
        },
      },
      tags: [
        {
          code: "qualifier",
          list: [
            {
              code: "item_count",
              value: "2",
            },
          ],
        },
        {
          code: "benefit",
          list: [
            {
              code: "item_count",
              value: "3",
            },
          ],
        },
        {
          code: "meta",
          list: [
            {
              code: "additive",
              value: "no",
            },
            {
              code: "auto",
              value: "yes",
            },
          ],
        },
      ],
    },
    {
      id: "FREEBIE",
      descriptor: {
        code: "freebie",
        images: ["https://sellerNP.com/images/offer3-banner.png"],
      },
      location_ids: ["L1"],
      item_ids: ["I1"],
      time: {
        label: "valid",
        range: {
          start: "2023-06-24T16:00:00.000Z",
          end: "2023-06-24T23:00:00.000Z",
        },
      },
      tags: [
        {
          code: "qualifier",
          list: [
            {
              code: "min_value",
              value: "598.00",
            },
          ],
        },
        {
          code: "benefit",
          list: [
            {
              code: "item_count",
              value: "1",
            },
            {
              code: "item_id",
              value: "sku id for extra item",
            },
            {
              code: "item_value",
              value: "200.00",
            },
          ],
        },
        {
          code: "meta",
          list: [
            {
              code: "additive",
              value: "no",
            },
            {
              code: "auto",
              value: "yes",
            },
          ],
        },
      ],
    },
  ];

  const gen_offer_benefit_label = (benefit) => {
    let b_type = benefit.list.find((tag) => {
      return tag["code"] === "value_type";
    })?.value;
    let b_value = benefit.list.find((tag) => {
      return tag["code"] === "value";
    })?.value;
    let str = "";
    switch (b_type) {
      case "percent":
        const cap_value =
          benefit.list.find((tag) => {
            return tag["code"] === "value_cap";
          }).value * -1;
        str = `Flat ${b_value * -1}% off`;
        break;
      case "amount":
        str = `flat ${b_value * -1} off`;
        break;
      default:
        break;
    }
    return str;
  };

  const format_offers_data = (offers_data) => {
    return offers_data.map((offer) => {
      let qualifier = offer.qualifier;
      let meta = offer.tags.filter((tag) => {
        return tag["code"] === "meta";
      });
      let benefit = offer.tags.filter((tag) => {
        return tag["code"] === "benefit";
      })[0];

      // y[0]["list"].filter(list => list.code === 'additive')
      meta = meta && meta[0];
      let additive =
        meta &&
        meta["list"].filter((list) => list.code === "additive")[0]["value"];
      let auto =
        meta && meta["list"].filter((list) => list.code === "auto")[0]["value"];
      return {
        id: offer.id,
        title: gen_offer_benefit_label(benefit),
        brand_image: offer.provider_descriptor.images[0],
        local_id: offer.local_id,
        type: offer.descriptor.code,
        item_ids: offer.item_ids,
        location_ids: offer.location_ids,
        qualifier: qualifier,
        benefit: benefit,
        additive: additive,
        auto: auto,
      };
    });
  };

  useEffect(() => {
    if (isValidCart() && cartItems.length > 0) {
      console.log("valid cart");
      getAllOffers();
    } else {
      console.log("Invalid cart");
    }
  }, [isValidCart(), cartItems]);

  const emptyCartScreen = () => {
    return (
      <div className={classes.emptyCartScreen}>
        <InfoOutlinedIcon
          color="warning"
          sx={{ fontSize: 90, marginBottom: 2 }}
        />
        <Typography
          variant="h3"
          sx={{ fontFamily: "Inter", fontWeight: 700, textTransform: "none" }}
        >
          Your Cart is Empty. Please add items
        </Typography>
        <Typography variant="body" sx={{ marginTop: 2, marginBottom: 2 }}>
          Explore our wide selection and find something you like
        </Typography>
        <Link to="/application/products">
          <Button variant="contained">Explore Now</Button>
        </Link>
      </div>
    );
  };

  const renderTableHeads = () => {
    return (
      <Grid>
        <Grid container sx={{ paddingTop: "20px" }}>
          <Grid item xs={4.3}>
            <Typography variant="body1" className={classes.tableHead}>
              Item
            </Typography>
          </Grid>
          <Grid item xs={1}>
            <Typography
              variant="body1"
              className={classes.tableHead}
              sx={{ marginLeft: "6px" }}
            >
              Price
            </Typography>
          </Grid>
          <Grid item xs={1.2}>
            <Typography
              variant="body1"
              className={classes.tableHead}
              sx={{ marginLeft: "12px" }}
            >
              Qty
            </Typography>
          </Grid>
          <Grid item xs={1.4}>
            <Typography variant="body1" className={classes.tableHead}>
              Subtotal
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body1" className={classes.tableHead}>
              Special Instructions
            </Typography>
          </Grid>
        </Grid>
        <Divider
          sx={{ borderColor: "#616161", margin: "20px 0", width: "98.5%" }}
        />
      </Grid>
    );
  };

  const renderTableHeadForCheckoutPage = () => {
    return (
      <Grid xs={14}>
        <Grid container>
          <Grid item xs={5.5}>
            <Typography variant="body1" className={classes.tableHead}>
              Item
            </Typography>
          </Grid>
          <Grid item xs={1.3}>
            <Typography
              variant="body1"
              className={classes.tableHead}
              sx={{ marginLeft: "6px" }}
            >
              Price
            </Typography>
          </Grid>
          <Grid item xs={1.5}>
            <Typography
              variant="body1"
              className={classes.tableHead}
              sx={{ marginLeft: "12px" }}
            >
              Qty
            </Typography>
          </Grid>
          <Grid item xs={1}>
            <Typography variant="body1" className={classes.tableHead}>
              Subtotal
            </Typography>
          </Grid>
          {/* <Grid item xs={4}>
            <Typography variant="body1" className={classes.tableHead}>
              Special Instructions
            </Typography>
          </Grid> */}
        </Grid>
        <Divider
          sx={{ borderColor: "#616161", margin: "20px 0", width: "98.5%" }}
        />
      </Grid>
    );
  };

  const getCustomizations = (cartItem) => {
    if (cartItem.item.customisations) {
      const customisations = cartItem.item.customisations;

      return customisations.map((c, idx) => {
        const isLastItem = idx === customisations.length - 1;
        return (
          <Grid container>
            <Typography variant="subtitle1" color="#686868">
              {c.item_details.descriptor.name} (₹{c.item_details.price.value}){" "}
              {isLastItem ? "" : "+"}
            </Typography>
          </Grid>
        );
      });
    }

    return null;
  };

  const getPriceWithCustomisations = (cartItem) => {
    let basePrice = cartItem.item.product.price.value;
    let price = 0;
    cartItem?.item?.customisations?.map(
      (c) => (price += c.item_details.price.value)
    );

    return basePrice + price;
  };

  const renderSpecialInstructions = (item, id) => {
    const cartItem = cartItems.find((ci) => ci._id == id);
    const hasSpecialInstructions = cartItem?.item?.customisations?.find((c) => {
      if (c.hasOwnProperty("special_instructions")) {
        return c;
      }
    });

    const handleChange = (e) => {
      const updatedCart = [...cartItems];
      const itemIndex = updatedCart.findIndex((ci) => ci._id === id);

      let itemToUpdate = updatedCart[itemIndex];
      itemToUpdate.item.customisations[0].special_instructions = e.target.value;
      updatedCart[itemIndex] = itemToUpdate;
      setCartItems(updatedCart);
    };
    if (!hasSpecialInstructions) return null;
    return (
      <div style={{ position: "relative" }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          size="small"
          placeholder="Write here"
          sx={{ padding: "2px 4px" }}
          value={hasSpecialInstructions?.special_instructions}
          onChange={handleChange}
        />
        <Button
          className={classes.updateBtn}
          variant="text"
          size="small"
          onClick={() => {
            updateCartItem(id, null, id);
          }}
        >
          Update
        </Button>
      </div>
    );
  };

  const renderVegNonVegTag = (cartItem) => {
    const FnB = "ONDC:RET11";
    const grocery = "ONDC:RET10";

    if (cartItem?.item?.domain == grocery || cartItem?.item?.domain == FnB) {
      const tags = cartItem?.item?.product?.tags;
      let category = "veg";

      for (let i = 0; i < tags.length; i++) {
        if (tags[i].code === "veg_nonveg") {
          const vegNonVegValue = tags[i].list[0].value;

          if (vegNonVegValue === "yes" || vegNonVegValue === "Yes") {
            category = "veg";
          } else if (vegNonVegValue === "no") {
            category = "nonveg";
          } else if (vegNonVegValue === "egg") {
            category = "egg";
          }
        }
      }

      const getTagColor = () => {
        if (category === "veg") {
          return "#008001";
        } else if (category == "nonveg") {
          return "red";
        } else {
          return "#008001";
        }
      };

      return (
        <Grid container alignItems="center" className={classes.tagContainer}>
          <div
            className={classes.square}
            style={{ borderColor: getTagColor() }}
          >
            <div
              className={classes.circle}
              style={{ backgroundColor: getTagColor() }}
            ></div>
          </div>
        </Grid>
      );
    }

    return null;
  };

  const renderProducts = () => {
    return cartItems?.map((cartItem, idx) => {
      return (
        <Grid key={cartItem._id}>
          <Grid
            container
            key={cartItem?.item?.id}
            style={{ alignItems: "flex-start" }}
          >
            <Grid item xs={4.3}>
              <Grid container>
                <div className={classes.moreImages}>
                  <div className={classes.greyContainer}>
                    <img
                      className={classes.moreImage}
                      alt="product-image"
                      src={cartItem?.item?.product?.descriptor?.symbol}
                      onClick={() =>
                        history.push(
                          `/application/products?productId=${cartItem.item.id}`
                        )
                      }
                    />
                    {renderVegNonVegTag(cartItem)}
                  </div>
                </div>
                <Grid sx={{ maxWidth: "200px" }}>
                  <Typography
                    variant="body1"
                    sx={{ width: 200, fontWeight: 600 }}
                  >
                    {cartItem?.item?.product?.descriptor?.name}
                  </Typography>
                  {getCustomizations(cartItem)}
                  {cartItem.item.hasCustomisations && (
                    <Grid
                      container
                      sx={{
                        marginTop: "4px",
                        width: "max-content",
                        cursor: "pointer",
                      }}
                      alignItems="center"
                      onClick={() => {
                        setCustomizationState(cartItem.item.customisationState);
                        getProductDetails(cartItem.item.id);
                        setCurrentCartItem(cartItem);
                        setOpenDrawer(true);
                      }}
                    >
                      <EditOutlinedIcon
                        size="small"
                        sx={{
                          color: "#196AAB",
                          fontSize: 16,
                          marginRight: "5px",
                        }}
                      />
                      <Typography variant="subtitle1" color="#196AAB">
                        Customise
                      </Typography>
                    </Grid>
                  )}
                  <Grid container sx={{ marginTop: "4px" }} alignItems="center">
                    <div className={classes.logoContainer}>
                      <img
                        className={classes.logo}
                        alt={"store-logo"}
                        src={cartItem?.item?.provider?.descriptor?.symbol}
                      />
                    </div>
                    <Typography
                      variant="subtitle1"
                      color="#686868"
                      sx={{ fontWeight: 500 }}
                    >
                      {cartItem?.item?.provider?.descriptor?.name}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              {/* {getCustomizations(cartItem)} */}
            </Grid>
            <Grid item xs={1}>
              <Typography variant="body" sx={{ fontWeight: 600 }}>
                {cartItem.item.hasCustomisations
                  ? `₹ ${getPriceWithCustomisations(cartItem)}`
                  : `₹ ${cartItem?.item?.product?.price?.value}`}
              </Typography>
            </Grid>
            <Grid item xs={1.2}>
              <div className={classes.qtyContainer}>
                <Typography
                  variant="body1"
                  sx={{ marginRight: "12px", fontWeight: 600 }}
                >
                  {cartItem?.item?.quantity?.count}
                </Typography>
                <KeyboardArrowUpIcon
                  className={classes.qtyArrowUp}
                  onClick={() =>
                    updateCartItem(cartItem.item.id, true, cartItem._id)
                  }
                />
                <KeyboardArrowDownIcon
                  className={classes.qtyArrowDown}
                  onClick={() =>
                    updateCartItem(cartItem.item.id, false, cartItem._id)
                  }
                />
              </div>
            </Grid>
            <Grid item xs={1.4}>
              <Typography variant="body" sx={{ fontWeight: 600 }}>
                {cartItem.item.hasCustomisations
                  ? `₹ ${
                      parseInt(getPriceWithCustomisations(cartItem)) *
                      parseInt(cartItem?.item?.quantity?.count)
                    }`
                  : `₹ ${parseInt(cartItem?.item?.product?.subtotal)}`}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              {renderSpecialInstructions(cartItem.item, cartItem._id)}

              <Grid
                container
                sx={{ margin: "16px 0" }}
                alignItems="center"
                justifyContent="flex-end"
              >
                <Button
                  variant="text"
                  startIcon={<DeleteOutlineIcon size="small" />}
                  color="error"
                  onClick={() => deleteCartItem(cartItem._id)}
                >
                  <Typography>Delete</Typography>
                </Button>
              </Grid>
            </Grid>
          </Grid>
          {cartItem.item.quantity.count >
            cartItem.item.product.quantity.available.count && (
            <Grid>
              <div className={classes.infoBox}>
                <Typography className={classes.infoText}>
                  Only {cartItem.item.product.quantity.available.count}{" "}
                  available instead of {cartItem.item.quantity.count}. Update
                  the quantity or switch to another provider.
                </Typography>
              </div>
            </Grid>
          )}
          {idx === cartItems.length - 1 && haveDistinctProviders && (
            <Grid>
              <div
                className={classes.infoBox}
                style={{ background: "#FAE1E1", width: "98.5%" }}
              >
                <Typography
                  className={classes.infoText}
                  style={{ color: "#D83232", textAlign: "center" }}
                >
                  You are ordering from different store. Please check your order
                  again.
                </Typography>
              </div>
            </Grid>
          )}
          {idx === cartItems.length - 1 && isProductCategoryIsDifferent && (
            <Grid>
              <div
                className={classes.infoBox}
                style={{ background: "#FAE1E1", width: "98.5%" }}
              >
                <Typography
                  className={classes.infoText}
                  style={{ color: "#D83232", textAlign: "center" }}
                >
                  You are ordering from different category. Please check your
                  order again.
                </Typography>
              </div>
            </Grid>
          )}
          <Divider
            sx={{ borderColor: "#616161", margin: "20px 0", width: "98.5%" }}
          />
        </Grid>
      );
    });
  };

  const renderProductsForCheckoutPage = () => {
    return cartItems?.map((cartItem, idx) => {
      return (
        <Grid key={cartItem._id}>
          <Grid
            container
            key={cartItem?.item?.id}
            style={{ alignItems: "flex-start" }}
          >
            <Grid item xs={5.5}>
              <Grid container>
                <div className={classes.moreImages}>
                  <div className={classes.greyContainer}>
                    <img
                      className={classes.moreImage}
                      alt="product-image"
                      src={cartItem?.item?.product?.descriptor?.symbol}
                      onClick={() =>
                        history.push(
                          `/application/products?productId=${cartItem.item.id}`
                        )
                      }
                    />
                    {renderVegNonVegTag(cartItem)}
                  </div>
                </div>
                <Grid sx={{ maxWidth: "200px" }}>
                  <Typography
                    variant="body1"
                    sx={{ width: 200, fontWeight: 600 }}
                  >
                    {cartItem?.item?.product?.descriptor?.name}
                  </Typography>
                  {getCustomizations(cartItem)}
                  {cartItem.item.hasCustomisations && (
                    <Grid
                      container
                      sx={{
                        marginTop: "4px",
                        width: "max-content",
                        cursor: "pointer",
                      }}
                      alignItems="center"
                      onClick={() => {
                        setCustomizationState(cartItem.item.customisationState);
                        getProductDetails(cartItem.item.id);
                        setCurrentCartItem(cartItem);
                        setOpenDrawer(true);
                      }}
                    >
                      <EditOutlinedIcon
                        size="small"
                        sx={{
                          color: "#196AAB",
                          fontSize: 16,
                          marginRight: "5px",
                        }}
                      />
                      <Typography variant="subtitle1" color="#196AAB">
                        Customise
                      </Typography>
                    </Grid>
                  )}
                  <Grid container sx={{ marginTop: "4px" }} alignItems="center">
                    <div className={classes.logoContainer}>
                      <img
                        className={classes.logo}
                        alt={"store-logo"}
                        src={cartItem?.item?.provider?.descriptor?.symbol}
                      />
                    </div>
                    <Typography
                      variant="subtitle1"
                      color="#686868"
                      sx={{ fontWeight: 500 }}
                    >
                      {cartItem?.item?.provider?.descriptor?.name}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              {/* {getCustomizations(cartItem)} */}
            </Grid>
            <Grid item xs={1.3}>
              <Typography variant="body" sx={{ fontWeight: 600 }}>
                {cartItem.item.hasCustomisations
                  ? `₹ ${getPriceWithCustomisations(cartItem)}`
                  : `₹ ${cartItem?.item?.product?.price?.value}`}
              </Typography>
            </Grid>
            <Grid item xs={1.5}>
              <div className={classes.qtyContainer}>
                <Typography
                  variant="body1"
                  sx={{ marginRight: "12px", fontWeight: 600 }}
                >
                  {cartItem?.item?.quantity?.count}
                </Typography>
                <KeyboardArrowUpIcon
                  className={classes.qtyArrowUp}
                  onClick={() =>
                    updateCartItem(cartItem.item.id, true, cartItem._id)
                  }
                />
                <KeyboardArrowDownIcon
                  className={classes.qtyArrowDown}
                  onClick={() =>
                    updateCartItem(cartItem.item.id, false, cartItem._id)
                  }
                />
              </div>
            </Grid>
            <Grid item xs={1.4}>
              <Typography variant="body" sx={{ fontWeight: 600 }}>
                {cartItem.item.hasCustomisations
                  ? `₹ ${
                      parseInt(getPriceWithCustomisations(cartItem)) *
                      parseInt(cartItem?.item?.quantity?.count)
                    }`
                  : `₹ ${parseInt(cartItem?.item?.product?.subtotal)}`}
              </Typography>
            </Grid>
            <Grid item xs={1.3}>
              {/* {renderSpecialInstructions(cartItem.item, cartItem._id)} */}
              <div style={{ marginTop: -10 }}>
                <Button
                  variant="text"
                  startIcon={<DeleteOutlineIcon size="small" />}
                  color="error"
                  onClick={() => deleteCartItem(cartItem._id)}
                >
                  <Typography>Delete</Typography>
                </Button>
              </div>
            </Grid>
          </Grid>
          {cartItem.item.quantity.count >
            cartItem.item.product.quantity.available.count && (
            <Grid>
              <div className={classes.infoBox}>
                <Typography className={classes.infoText}>
                  Only {cartItem.item.product.quantity.available.count}{" "}
                  available instead of {cartItem.item.quantity.count}. Update
                  the quantity or switch to another provider.
                </Typography>
              </div>
            </Grid>
          )}
          {idx === cartItems.length - 1 && haveDistinctProviders && (
            <Grid>
              <div
                className={classes.infoBox}
                style={{ background: "#FAE1E1", width: "98.5%" }}
              >
                <Typography
                  className={classes.infoText}
                  style={{ color: "#D83232", textAlign: "center" }}
                >
                  You are ordering from different store. Please check your order
                  again.
                </Typography>
              </div>
            </Grid>
          )}
          {idx === cartItems.length - 1 && isProductCategoryIsDifferent && (
            <Grid>
              <div
                className={classes.infoBox}
                style={{ background: "#FAE1E1", width: "98.5%" }}
              >
                <Typography
                  className={classes.infoText}
                  style={{ color: "#D83232", textAlign: "center" }}
                >
                  You are ordering from different category. Please check your
                  order again.
                </Typography>
              </div>
            </Grid>
          )}
          {cartItems.length > 1 && (
            <Divider
              sx={{ borderColor: "#616161", margin: "20px 0", width: "98.5%" }}
            />
          )}
        </Grid>
      );
    });
  };

  const renderSummaryCard = () => {
    return (
      <Card className={classes.summaryCard}>
        <Typography variant="h4" className={classes.summaryTypo}>
          Summary
        </Typography>
        <Divider sx={{ borderColor: "#616161", margin: "20px 0" }} />
        <Grid
          container
          justifyContent="space-between"
          sx={{ marginBottom: "14px" }}
        >
          <Typography variant="subtitle1" className={classes.summaryLabel}>
            Cart Subtotal
          </Typography>
          <Typography variant="subtitle1" className={classes.summaryLabel}>
            ₹{getCartSubtotal()}
          </Typography>
        </Grid>
        <Button
          variant="contained"
          sx={{ marginTop: 1, marginBottom: 2 }}
          disabled={!isValidCart()}
          onClick={() => {
            if (cartItems.length > 0) {
              let c = cartItems.map((item) => {
                return item.item;
              });

              const request_object = constructQouteObject(c);
              getQuote(request_object[0]);
              getProviderIds(request_object[0]);
            }
          }}
        >
          {checkoutLoading ? <Loading /> : "Checkout"}
        </Button>
      </Card>
    );
  };

  const getProviderIds = (request_object) => {
    let providers = [];
    request_object.map((cartItem) => {
      providers.push(cartItem.provider.local_id);
    });
    const ids = [...new Set(providers)];
    AddCookie("providerIds", ids);
    return ids;
  };

  const offerInSelectFormat = (id) => {
    return {
      id: id,
      tags: [
        {
          code: "selection",
          list: [
            {
              code: "apply",
              value: "yes",
            },
          ],
        },
      ],
    };
  };

  const offersForSelect = () => {
    if (selectedNonAdditiveOffer) {
      console.log("selectedNonAdditiveOffer", selectedNonAdditiveOffer);
      return [offerInSelectFormat(selectedNonAdditiveOffer)];
    } else {
      return selectedAdditiveOffers.length > 0
        ? selectedAdditiveOffers.map((id) => offerInSelectFormat(id))
        : [];
    }
  };

  const getQuote = async (items, searchContextData = null) => {
    const ttansactionId = localStorage.getItem("transaction_id");
    responseRef.current = [];
    if (deliveryAddress) {
      console.log("select req:", deliveryAddress.location.address.lat);
      try {
        setCheckoutLoading(true);
        const search_context =
          searchContextData || JSON.parse(getValueFromCookie("search_context"));
        let domain = "";
        let contextCity = "";
        const updatedItems = items.map((item) => {
          const newItem = Object.assign({}, item);
          domain = newItem.domain;
          contextCity = newItem.contextCity;
          delete newItem.context;
          delete newItem.contextCity;
          return newItem;
        });
        let selectPayload = {
          context: {
            transaction_id: ttansactionId,
            domain: domain,
            city: contextCity || deliveryAddress.location.address.city,
            pincode: JSON.parse(getValueFromCookie("delivery_address"))
              ?.location.address.areaCode,
            state: deliveryAddress.location.address.state,
          },
          message: {
            cart: {
              items: updatedItems,
            },
            offers: offersForSelect(),
            fulfillments: [
              {
                end: {
                  location: {
                    gps: `${deliveryAddress?.location?.address?.lat},${deliveryAddress?.location?.address?.lng}`,
                    address: {
                      area_code: `${search_context?.location?.pincode}`,
                    },
                  },
                },
              },
            ],
          },
        };
        const data = await cancellablePromise(
          postCall("/clientApis/v2/select", [selectPayload])
        );
        //Error handling workflow eg, NACK
        const isNACK = data.find(
          (item) => item.error && item?.message?.ack?.status === "NACK"
        );
        if (isNACK) {
          setCheckoutLoading(false);
          dispatch({
            type: toast_actions.ADD_TOAST,
            payload: {
              id: Math.floor(Math.random() * 100),
              type: toast_types.error,
              message: isNACK.error.message,
            },
          });
          setGetQuoteLoading(false);
        } else {
          // fetch through events
          onFetchQuote(
            data?.map((txn) => {
              const { context } = txn;
              return context?.message_id;
            })
          );
        }
      } catch (err) {
        dispatch({
          type: toast_actions.ADD_TOAST,
          payload: {
            id: Math.floor(Math.random() * 100),
            type: toast_types.error,
            message: err?.response?.data?.error?.message,
          },
        });
        setGetQuoteLoading(false);
        history.replace("/application/products");
        setCheckoutLoading(false);
      }
    } else {
      dispatch({
        type: toast_actions.ADD_TOAST,
        payload: {
          id: Math.floor(Math.random() * 100),
          type: toast_types.error,
          message: "Please select address",
        },
      });
      setCheckoutLoading(false);
    }

    // eslint-disable-next-line
  };

  function onFetchQuote(message_id) {
    eventTimeOutRef.current = [];

    const token = getValueFromCookie("token");
    let header = {
      headers: {
        ...(token && {
          Authorization: `Bearer ${token}`,
        }),
      },
    };
    message_id.forEach((id) => {
      let es = new window.EventSourcePolyfill(
        `${process.env.REACT_APP_BASE_URL}clientApis/events/v2?messageId=${id}`,
        header
      );
      es.addEventListener("on_select", (e) => {
        const { messageId } = JSON.parse(e.data);

        onGetQuote(messageId);
      });
      const timer = setTimeout(() => {
        eventTimeOutRef.current.forEach(({ eventSource, timer }) => {
          eventSource.close();
          clearTimeout(timer);
        });
        if (responseRef.current.length <= 0) {
          setGetQuoteLoading(false);
          setCheckoutLoading(false);
          dispatch({
            type: toast_actions.ADD_TOAST,
            payload: {
              id: Math.floor(Math.random() * 100),
              type: toast_types.error,
              message: "Cannot fetch details for this product",
            },
          });
          history.replace("/application/products");
          return;
        } else {
        }
        let c = cartItems.map((item) => {
          return item.item;
        });
        const request_object = constructQouteObject(c);
        if (responseRef.current.length !== request_object.length) {
          dispatch({
            type: toast_actions.ADD_TOAST,
            payload: {
              id: Math.floor(Math.random() * 100),
              type: toast_types.error,
              message:
                "Cannot fetch details for some product those products will be ignored!",
            },
          });
          setErrorMessageTimeOut("Cannot fetch details for this product");
        }
        setToggleInit(true);
      }, SSE_TIMEOUT);

      eventTimeOutRef.current = [
        ...eventTimeOutRef.current,
        {
          eventSource: es,
          timer,
        },
      ];

      // history.push(`/application/checkout`);
    });
  }

  const onGetQuote = async (message_id) => {
    try {
      setCheckoutLoading(true);
      const data = await cancellablePromise(
        getCall(`/clientApis/v2/on_select?messageIds=${message_id}`)
      );
      responseRef.current = [...responseRef.current, data[0]];

      setEventData((eventData) => [...eventData, data[0]]);

      // onUpdateProduct(data[0].message.quote.items, data[0].message.quote.fulfillments);
      data[0].message.quote.items.forEach((item) => {
        const findItemIndexFromCart = updatedCartItems.current.findIndex(
          (prod) => prod.item.product.id === item.id
        );
        if (findItemIndexFromCart > -1) {
          updatedCartItems.current[
            findItemIndexFromCart
          ].item.product.fulfillment_id = item.fulfillment_id;
          updatedCartItems.current[
            findItemIndexFromCart
          ].item.product.fulfillments = data[0].message.quote.fulfillments;
        }
      });

      localStorage.setItem(
        "cartItems",
        JSON.stringify(updatedCartItems.current)
      );
      localStorage.setItem(
        "updatedCartItems",
        JSON.stringify(responseRef.current)
      );
      localStorage.setItem(
        "offers",
        JSON.stringify({
          additive_offers: selectedAdditiveOffers,
          non_additive_offer: selectedNonAdditiveOffer,
        })
      );
      history.push(`/application/checkout`);
    } catch (err) {
      setCheckoutLoading(false);
      dispatch({
        type: toast_actions.ADD_TOAST,
        payload: {
          id: Math.floor(Math.random() * 100),
          type: toast_types.error,
          message: err.message,
        },
      });
      setGetQuoteLoading(false);
    }
    // eslint-disable-next-line
  };

  const CustomCheckbox = styled(Checkbox)(({ theme }) => ({
    border: "none",
  }));

  const offerCard = (offer) => {
    return (
      <OfferCard
        id={offer.id}
        title={offer.title}
        offerText={offer.local_id}
        link={offer.link}
        brandImage={offer.brand_image}
        isDisplayOnCartPage={true}
      />
    );
  };

  const renderNonAdditiveOffers = (offers) => {
    const handleClick = (event) => {
      if (event.target.value === selectedNonAdditiveOffer) {
        setSelectedNonAdditiveOffer("");
      } else {
        setSelectedNonAdditiveOffer(event.target.value);
        setSelectedAdditiveOffers([]);
      }
    };

    function isOfferSelected(id) {
      return selectedNonAdditiveOffer === id;
    }

    return (
      <Grid container alignItems="center" sx={{ marginBottom: 1.5 }}>
        <Grid
          container
          sx={{ marginBottom: 1.5, marginLeft: 3 }}
          direction={"column"}
        >
          {offers?.map((offer) => {
            return (
              <div className={classes.fulfillment}>
                <FormControlLabel
                  label={offerCard(offer)}
                  value={isOfferSelected(offer.id)}
                  control={
                    <CustomCheckbox
                      id={offer.id}
                      checked={isOfferSelected(offer.id)}
                      disabled={
                        !isOfferSelected(offer.id) &&
                        (selectedNonAdditiveOffer ||
                          selectedAdditiveOffers.length > 0)
                      }
                      onChange={(event) => {
                        let id = "";
                        if (selectedNonAdditiveOffer !== offer.id) {
                          id = offer.id;
                          setSelectedAdditiveOffers([]);
                        }
                        setSelectedNonAdditiveOffer(id);
                      }}
                    />
                  }
                />
              </div>
            );
          })}
        </Grid>
      </Grid>
    );
  };

  const renderAdditiveOffers = (offers, selectedAdditiveOffers) => {
    function isOfferSelected(id) {
      return (
        selectedAdditiveOffers.filter((offer_id) => offer_id === id).length > 0
      );
    }

    return (
      <Grid container alignItems="center" sx={{ marginBottom: 1.5 }}>
        <Grid
          container
          // sx={{ marginBottom: 1.5, marginLeft: 1.5 }}
          direction={"column"}
        >
          {offers?.map((offer) => {
            return (
              <div className={classes.fulfillment}>
                <FormControlLabel
                  label={offerCard(offer)}
                  value={isOfferSelected(offer.id)}
                  control={
                    <CustomCheckbox
                      id={offer.id}
                      checked={isOfferSelected(offer.id)}
                      disabled={selectedNonAdditiveOffer}
                      onChange={(event) => {
                        let ids = selectedAdditiveOffers;
                        if (
                          ids.includes(offer.id) &&
                          event.target.checked === false
                        ) {
                          ids = ids.filter((id) => id !== offer.id);
                        } else {
                          ids.push(offer.id);
                        }
                        setSelectedAdditiveOffers([...ids]);
                        setSelectedNonAdditiveOffer("");
                      }}
                    />
                  }
                />
              </div>
            );
          })}
        </Grid>
      </Grid>
    );
  };

  const renderOffers = () => {
    let formatted_offers = format_offers_data(offers).filter(
      (offer) => offer.auto === "no"
    );
    if (formatted_offers.length === 0 || haveDistinctProviders) return <></>;
    let additive_offers = formatted_offers.filter(
      (offer) => offer.additive === "yes"
    );
    let non_additive_offers = formatted_offers.filter(
      (offer) => offer.additive === "no"
    );
    console.log("additive_offers", additive_offers);
    console.log("nonadditive_offers", non_additive_offers);

    return (
      <>
        <Typography
          variant="h5"
          className={classes.tableHead}
          sx={{ marginLeft: "6px", marginTop: "50px", marginBottom: "20px" }}
        >
          Offers
        </Typography>
        {additive_offers.length > 0 &&
          renderAdditiveOffers(additive_offers, selectedAdditiveOffers)}
        {non_additive_offers.length > 0 &&
          renderNonAdditiveOffers(non_additive_offers)}
      </>
    );
  };

  return (
    <div>
      {!showOnlyItems && (
        <div className={classes.headingContainer}>
          <Typography variant="h3" className={classes.heading}>
            My Cart
          </Typography>
        </div>
      )}
      {loading ? (
        <div className={classes.loadingContainer}>
          <Loading />
        </div>
      ) : (
        <>
          {cartItems.length === 0 ? (
            emptyCartScreen()
          ) : (
            <div>
              {!showOnlyItems ? (
                <Grid container className={classes.cartContainer}>
                  <Grid item xs={8}>
                    {renderTableHeads()}
                    <div
                      style={{
                        minHeight: "80vh",
                      }}
                    >
                      <div
                        style={{
                          // minHeight: "50vh",
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                        }}
                      >
                        {renderProducts()}
                      </div>
                      {renderOffers()}
                    </div>
                  </Grid>

                  <Grid item xs={4}>
                    {renderSummaryCard()}
                  </Grid>
                </Grid>
              ) : (
                <div>
                  {renderTableHeadForCheckoutPage()}
                  <div
                    style={{
                      alignItems: "flex-start",
                      justifyContent: "flex-start",
                    }}
                  >
                    {renderProductsForCheckoutPage()}
                  </div>
                </div>
              )}
              <Drawer
                anchor={"right"}
                open={openDrawer}
                onClose={() => {
                  setProductPayload(null);
                  setCustomizationState({});
                  setOpenDrawer(false);
                }}
              >
                <EditCustomizations
                  cartItems={cartItems}
                  productPayload={productPayload}
                  setProductPayload={setProductPayload}
                  customization_state={customization_state}
                  setCustomizationState={setCustomizationState}
                  setOpenDrawer={setOpenDrawer}
                  currentCartItem={currentCartItem}
                />
              </Drawer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useContext, useState, useEffect, useRef } from "react";
import CrossIcon from "../../shared/svg/cross-icon";
import { ONDC_COLORS } from "../../shared/colors";
import styles from "../../../styles/search-product-modal/searchProductModal.module.scss";
import productStyles from "../../../styles/orders/orders.module.scss";
import productCartStyles from "../../../styles/products/productCard.module.scss";
import ErrorMessage from "../../shared/error-message/errorMessage";
import { toast_actions, toast_types } from "../../shared/toast/utils/toast";
import { ToastContext } from "../../../context/toastContext";
import useCancellablePromise from "../../../api/cancelRequest";
import { getCall, postCall } from "../../../api/axios";
import Checkbox from "../../shared/checkbox/checkbox";
import Dropdown from "../../shared/dropdown/dropdown";
import DropdownSvg from "../../shared/svg/dropdonw";
import { ISSUE_TYPES } from "../../../constants/issue-types";
import Input from "../../shared/input/input";
import validator from "validator";
import { getValueFromCookie } from "../../../utils/cookies";
import { SSE_TIMEOUT } from "../../../constants/sse-waiting-time";
import Subtract from "../../shared/svg/subtract";
import Add from "../../shared/svg/add";
import { Button, Typography } from "@mui/material";
import Loading from "../../shared/loading/loading";

export default function IssueOrderModal({
  billing_address,
  transaction_id,
  fulfillments,
  bpp_id,
  bpp_uri,
  order_id,
  order_status,
  partailsIssueProductList = [],
  onClose,
  onSuccess,
  quantity,
  domain
}) {
  // STATES
  const [inlineError, setInlineError] = useState({
    selected_id_error: "",
    subcategory_error: "",
    shortDescription_error: "",
    longDescription_error: "",
    image_error: ""
  });
  const [loading, setLoading] = useState(false);
  const [selectedIssueSubcategory, setSelectedIssueSubcategory] = useState();
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [email, setEmail] = useState(billing_address.email);
  const [baseImage, setBaseImage] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [orderQty, setOrderQty] = useState([]);
  const AllCategory = ISSUE_TYPES.map((item) => {
    return item.subCategory.map((subcategoryItem) => {
      return {
        ...subcategoryItem,
        category: item.value,
      };
    });
  }).flat();

  // REFS
  const cancelPartialEventSourceResponseRef = useRef(null);
  const eventTimeOutRef = useRef([]);

  // CONTEXT
  const dispatch = useContext(ToastContext);

  // HOOKS
  const { cancellablePromise } = useCancellablePromise();

  // use this function to dispatch error
  function dispatchToast(message, type) {
    dispatch({
      type: toast_actions.ADD_TOAST,
      payload: {
        id: Math.floor(Math.random() * 100),
        type,
        message,
      },
    });
  }

  // use this api to raise an order issue
  async function handleRaiseOrderIssue() {
    const allCheckPassed = [
      checkSubcategory(),
      checkIsOrderSelected(),
      checkShortDescription(),
      checkLongDescription(),
      checkImages()
    ].every(Boolean);
    if (!allCheckPassed) return;

    cancelPartialEventSourceResponseRef.current = [];
    setLoading(true);
    const user = JSON.parse(getValueFromCookie("user"));
    try {
      const createdDateTime = new Date().toISOString()
      const data = await cancellablePromise(
        postCall("/issueApis/v1/issue", {
          context: {
            transaction_id,
            domain
          },
          message: {
            issue: {
              category: selectedIssueSubcategory.category.toUpperCase(),
              sub_category: selectedIssueSubcategory.enums,
              bppId: bpp_id,
              bpp_uri,
              created_at: createdDateTime,
              updated_at: createdDateTime,
              complainant_info: {
                person: {
                  name: billing_address.name,
                },
                contact: {
                  phone: billing_address.phone,
                  email: email === "" ? user?.email : email,
                },
              },
              description: {
                short_desc: shortDescription,
                long_desc: longDescription,
                additional_desc: {
                  url: "https://buyerapp.com/additonal-details/desc.txt",
                  content_type: "text/plain",
                },
                images: baseImage,
              },
              order_details: {
                id: order_id,
                state: order_status,
                items: selectedIds,
                fulfillments,
                provider_id: selectedIds?.[0]?.product.provider_details?.id,
              },
              issue_actions: {
                complainant_actions: [],
                respondent_actions: [],
              },
            },
          },
        })
      );
      //Error handling workflow eg, NACK
      if (data.message && data.message.ack.status === "NACK") {
        setLoading(false);
        dispatchToast("Something went wrong", toast_types.error);
      } else {
        fetchCancelPartialOrderDataThroughEvents(data.context?.message_id, createdDateTime);
      }
    } catch (err) {
      setLoading(false);
      dispatchToast(err?.message, toast_types.error);
    }
  }

  // use this function to fetch cancel product through events
  function fetchCancelPartialOrderDataThroughEvents(message_id, createdDateTime) {
    const token = getValueFromCookie("token");
    let header = {
      headers: {
        ...(token && {
          Authorization: `Bearer ${token}`,
        }),
      },
    };
    let es = new window.EventSourcePolyfill(
      `${process.env.REACT_APP_BASE_URL}issueApis/events?messageId=${message_id}`,
      header
    );

    es.addEventListener("on_issue", (e) => {
      if (e?.data) {
        const { messageId } = JSON.parse(e.data);
        getPartialCancelOrderDetails(messageId, createdDateTime);
      } else {
        setLoading(false);
        onSuccess();
      }
    });


    const timer = setTimeout(() => {
      // es.close();
      if (cancelPartialEventSourceResponseRef.current.length <= 0) {
        // dispatchToast(
        //   "Cannot proceed with you request now! Please try again",
        //   toast_types.error
        // );
        setLoading(false);
        onSuccess();
      }
    }, SSE_TIMEOUT);

    eventTimeOutRef.current = [
      ...eventTimeOutRef.current,
      {
        eventSource: es,
        timer,
      },
    ];
  }

  // on Issue api
  async function getPartialCancelOrderDetails(message_id, createdDateTime) {
    try {
      const data = await cancellablePromise(
        getCall(`/issueApis/v1/on_issue?messageId=${message_id}&createdDateTime=${createdDateTime}`)
      );
      cancelPartialEventSourceResponseRef.current = [
        ...cancelPartialEventSourceResponseRef.current,
        data,
      ];
      setLoading(false);
      onSuccess();
    } catch (err) {
      setLoading(false);
      onSuccess();
      dispatchToast(err?.message, toast_types.error);
      eventTimeOutRef.current.forEach(({ eventSource, timer }) => {
        eventSource.close();
        clearTimeout(timer);
      });
    }
  }

  useEffect(() => {
    if (order_status === "Created" || order_status === "Accepted" || order_status === "In-progress") {
      const type = AllCategory.find(
        ({ enums }) =>
          enums === "FLM02"
      );
      setSelectedIssueSubcategory(type);
    }
    return () => {
      eventTimeOutRef.current.forEach(({ eventSource, timer }) => {
        eventSource.close();
        clearTimeout(timer);
      });
    };
  }, []);

  function checkShortDescription() {
    if (validator.isEmpty(shortDescription.trim())) {
      setInlineError((error) => ({
        ...error,
        shortDescription_error: "Please enter short description",
      }));
      return false;
    }
    return true;
  }

  function checkLongDescription() {
    if (validator.isEmpty(longDescription.trim())) {
      setInlineError((error) => ({
        ...error,
        longDescription_error: "Please enter long description",
      }));
      return false;
    }
    return true;
  }

  // use this function to check if any order is selected
  function checkIsOrderSelected() {
    if (selectedIds.length <= 0) {
      setInlineError((error) => ({
        ...error,
        selected_id_error: "Please select item to raise an issue",
      }));
      return false;
    }
    return true;
  }

  // use this function to check if any reason is selected
  function checkSubcategory() {
    if (!selectedIssueSubcategory) {
      setInlineError((error) => ({
        ...error,
        subcategory_error: "Please select subcategory",
      }));
      return false;
    }
    return true;
  }

  // use this function to check if any image is selected
  function checkImages() {
    if (['ITM02', 'ITM03', 'ITM04', 'ITM05', 'FLM04'].includes(selectedIssueSubcategory?.enums) && baseImage <= 0) {
      setInlineError((error) => ({
        ...error,
        image_error: "Please upload an image file",
      }));
      return false;
    }
    return true;
  }

  // use this function to check if the provider is already selected
  function isProductSelected(id) {
    return (
      selectedIds.filter(({ id: provider_id }) => provider_id === id).length > 0
    );
  }

  // use this function to add attribute in filter list
  function addProductToCancel(attribute, qty) {
    let modifiedAttributes = {
      id: attribute.id,
      quantity: {
        count: qty,
      },
      product: attribute,
    };
    setSelectedIds([...selectedIds, modifiedAttributes]);
  }

  // use this function to remove the selected attribute from filter
  function removeProductToCancel(attribute) {
    setSelectedIds(selectedIds.filter(({ id }) => id !== attribute.id));
  }

  useEffect(() => {
    if (quantity) {
      setOrderQty(JSON.parse(JSON.stringify(Object.assign(quantity))));
    }
  }, [quantity]);

  const uploadImage = async (e) => {
    const file = e.target.files;
    const uploaded = [...baseImage];

    for (let index = 0; index < file.length; index++) {
      const element = file[index];
      const base64 = await convertBase64(element);
      uploaded.push(base64);
      if (index === file.length - 1) {
        setBaseImage(uploaded);
      }
    }
  };

  const convertBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      fileReader.onload = () => {
        resolve(fileReader.result);
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };

  const onUpdateQty = (qty, idx, pId) => {
    let qtyData = Object.assign([], orderQty);
    qtyData[idx].count = qty;
    setOrderQty(qtyData);
    updateQtyForSelectedProduct(pId, qty);
  };

  function updateQtyForSelectedProduct(pId, qty) {
    let data = JSON.parse(JSON.stringify(Object.assign([], selectedIds)));
    data = data.map((item) => {
      if (item.id === pId) {
        item.quantity.count = qty;
      } else {
      }
      return item;
    });
    setSelectedIds(data);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.popup_card} style={{ width: "700px" }}>
        <div className={`${styles.card_header} d-flex align-items-center`}>
          <p className={styles.card_header_title}>Raise an Issue</p>
          <div className="ms-auto">
            <CrossIcon
              width="20"
              height="20"
              color={ONDC_COLORS.SECONDARYCOLOR}
              style={{ cursor: "pointer" }}
              onClick={onClose}
            />
          </div>
        </div>
        <div className={styles.card_body}>
          <p className={`${styles.cancel_dropdown_label_text} ${styles.required}`}>
            Choose Items that had a problem
          </p>
          <div style={{ maxHeight: "250px", overflow: "auto" }}>
            <div className="px-1 py-2">
              {partailsIssueProductList?.map((product, idx) => {
                return (
                  <div key={product?.id} className="d-flex align-items-center">
                    <div
                      style={{
                        width: "80%",
                      }}
                    >
                      <Checkbox
                        id={product?.id}
                        checked={isProductSelected(product?.id)}
                        disabled={loading}
                        boxBasis="20%"
                        nameBasis="80%"
                        onClick={() => {
                          setInlineError((error) => ({
                            ...error,
                            selected_id_error: "",
                          }));
                          if (isProductSelected(product?.id)) {
                            removeProductToCancel(product);
                            return;
                          }
                          addProductToCancel(product, orderQty[idx]?.count);
                        }}
                      >
                        <Typography
                          className={productStyles.product_name}
                          title={product?.name}
                          style={{ fontSize: "16px", textAlign: "left" }}
                        >
                          {product?.name}
                        </Typography>
                        <div className="pt-1">
                          <Typography
                            className={productStyles.quantity_count}
                            title={quantity[idx]?.count}
                            style={{ textAlign: "left" }}
                          >
                            QTY: {quantity[idx]?.count ?? "0"}
                          </Typography>

                          {/* <Typography variant="subtitle1" color="#686868">
                            QTY: {quantity?.[idx]?.count ?? "0"} X ₹{" "}
                            {Number(product?.price?.value)?.toFixed(2) || "Price Not Available"}
                          </Typography> */}
                          {/* {Object.keys(product?.customizations || {}).map((key, idx) => {
                            const isLastItem = idx === Object.keys(product.customizations || {}).length - 1;
                            return (
                              <Grid container key={key}>
                                <Typography variant="subtitle1" color="#686868">
                                  {product.customizations[key].title || "Customization Title"} (₹
                                  {product.customizations[key].price.value || "0"}) {isLastItem ? "" : "+"}
                                </Typography>
                              </Grid>
                            );
                          })} */}
                        </div>
                      </Checkbox>
                    </div>

                    <div style={{ width: "30%" }}>
                      <div
                        className={productCartStyles.quantity_count_wrapper}
                        style={{ marginLeft: "30px !important" }}
                      >
                        <div
                          className={`${orderQty[idx]?.count > 1
                            ? productCartStyles.subtract_svg_wrapper
                            : ""
                            } d-flex align-items-center justify-content-center`}
                          onClick={() => {
                            if (orderQty[idx]?.count > 1 && isProductSelected(product?.id)) {
                              onUpdateQty(
                                orderQty[idx]?.count - 1,
                                idx,
                                product?.id
                              );
                            }
                          }}
                        >
                          {orderQty[idx]?.count > 1 && (
                            <Subtract
                              width="13"
                              classes={productCartStyles.subtract_svg_color}
                            />
                          )}
                        </div>
                        <div className="d-flex align-items-center justify-content-center">
                          <p className={productCartStyles.quantity_count}>
                            {orderQty[idx]?.count ?? "0"}
                          </p>
                        </div>
                        <div
                          className={`${orderQty[idx]?.count < quantity[idx]?.count
                            ? productCartStyles.add_svg_wrapper
                            : ""
                            } d-flex align-items-center justify-content-center`}
                          onClick={() => {
                            if (orderQty[idx]?.count < quantity[idx]?.count && isProductSelected(product?.id)) {
                              onUpdateQty(
                                orderQty[idx]?.count + 1,
                                idx,
                                product?.id
                              );
                            }
                          }}
                        >
                          {orderQty[idx]?.count < quantity[idx]?.count && (
                            <Add
                              width="13"
                              height="13"
                              classes={productCartStyles.add_svg_color}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ms-auto">
                      <p
                        className={productStyles.product_price}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        ₹ {Number(product?.price?.value)?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* )} */}
          </div>
          {inlineError.selected_id_error && (
            <ErrorMessage>{inlineError.selected_id_error}</ErrorMessage>
          )}
          {
            order_status === "Completed" &&
            <div className="px-2">
              <p className={`${styles.cancel_dropdown_label_text} ${styles.required}`}>
                Select Issue Subcategory
              </p>
              <Dropdown
                id="dropdownOne"
                header={
                  <div
                    className={`${styles.cancel_dropdown_wrapper} d-flex align-items-center`}
                  >
                    <div className="px-2">
                      <p className={styles.cancel_dropdown_text}>
                        {selectedIssueSubcategory?.value
                          ? selectedIssueSubcategory?.value
                          : "Select issue subcategory"}
                      </p>
                    </div>
                    <div className="px-2 ms-auto">
                      <DropdownSvg
                        width="15"
                        height="10"
                        color={ONDC_COLORS.ACCENTCOLOR}
                      />
                    </div>
                  </div>
                }
                body_classes="dropdown-menu-end dropdown-menu-lg-start"
                style={{ width: "100%", maxHeight: "250px", overflow: "auto" }}
                click={(reasonValue) => {
                  const type = AllCategory.find(
                    ({ value }) =>
                      value.toLowerCase() === reasonValue.toLowerCase()
                  );
                  setSelectedIssueSubcategory(type);
                  setInlineError((error) => ({
                    ...error,
                    subcategory_error: "",
                  }));
                }}
                options={AllCategory.filter(({ enums }) => enums !== "FLM02").map(({ value }) => ({ value }))}
                show_icons={false}
              />
              {inlineError.subcategory_error && (
                <ErrorMessage>{inlineError.subcategory_error}</ErrorMessage>
              )}
            </div>
          }

          <div className="px-2">
            {
              (order_status === "Created" || order_status === "Accepted" || order_status === "In-progress") && (
                <Input
                  label_name="Select Issue Subcategory"
                  disabled
                  type="text"
                  value={'Delay in delivery'}
                />
              )
            }
            <Input
              label_name="Short Description"
              type="text"
              placeholder="Enter short description"
              id="shortDes"
              value={shortDescription}
              onChange={(event) => {
                const name = event.target.value;
                setShortDescription(name);
                setInlineError((error) => ({
                  ...error,
                  shortDescription_error: "",
                }));
              }}
              required
              has_error={inlineError.shortDescription_error}
            />

            <Input
              label_name="Long Description"
              type="text"
              placeholder="Enter long description"
              id="longDes"
              value={longDescription}
              onChange={(event) => {
                const name = event.target.value;
                setLongDescription(name);
                setInlineError((error) => ({
                  ...error,
                  longDescription_error: "",
                }));
              }}
              required
              has_error={inlineError.longDescription_error}
            />

            <Input
              label_name="Email"
              type="text"
              placeholder="Enter Email"
              id="email"
              value={email}
              onChange={(event) => {
                const name = event.target.value;
                setEmail(name);
              }}
            />
            <Input
              label_name="Images (Maximum 4)"
              type="file"
              id="images"
              accept="image/png,image/jpg"
              onChange={(event) => {
                const file = event.target.files[0];
                if (file?.size / 1024 > 2048) {
                  dispatchToast("File size cannot exceed more than 2MB", toast_types.error);
                } else {
                  uploadImage(event);
                  setInlineError((error) => ({
                    ...error,
                    image_error: "",
                  }));
                }
              }}
              required={['ITM02', 'ITM03', 'ITM04', 'ITM05', 'FLM04'].includes(selectedIssueSubcategory?.enums)}
              has_error={inlineError.image_error}
              disabled={baseImage.length === 4}
            />
            {inlineError.image_error && (
              <ErrorMessage>{inlineError.image_error}</ErrorMessage>
            )}
          </div>
          <div className="d-flex">
            {baseImage?.map((image, index) => {
              const bgStyle = {
                backgroundImage: `url(${image})`,
                height: 80,
                width: 60,
                marginInline: 10,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
              };
              return (
                <div key={index} style={bgStyle}>
                  <CrossIcon
                    width="20"
                    height="20"
                    color={ONDC_COLORS.SECONDARYCOLOR}
                    style={{ cursor: "pointer", backgroundColor: '#F0F0F0', marginTop: -10 }}
                    onClick={() =>
                      setBaseImage(baseImage.filter(item => item !== image))
                    }
                  />
                  {/* <img style={{ height: "100%", width: "100%" }} src={image} /> */}
                </div>
              );
            })}
          </div>


        </div>
        <div
          className={`${styles.card_footer} d-flex align-items-center`}
        >
          <div className="px-3">
            <Button
              sx={{ paddingLeft: 4, paddingRight: 4 }}
              disabled={loading}
              variant="outlined"
              onClick={() => {
                onClose();
              }}
            >
              Cancel
            </Button>
          </div>
          <div className="px-3">
            <Button
              sx={{ paddingLeft: 4, paddingRight: 4 }}
              disabled={loading}
              variant="contained"
              onClick={() => {
                handleRaiseOrderIssue();
              }}
            >
              {loading ? (
                <Loading />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

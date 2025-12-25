import { useForm } from "@inertiajs/react";
import cx from "classnames";
import * as React from "react";

import type { CollaboratorFormProduct, CollaboratorFormData } from "$app/data/collaborators";
import { isValidEmail } from "$app/utils/email";

import { Button } from "$app/components/Button";
import { Layout } from "$app/components/Collaborators/Layout";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { NavigationButtonInertia } from "$app/components/NavigationButton";
import { NumberInput } from "$app/components/NumberInput";
import { showAlert } from "$app/components/server-components/Alert";
import { Pill } from "$app/components/ui/Pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$app/components/ui/Table";
import { WithTooltip } from "$app/components/WithTooltip";

const DEFAULT_PERCENT_COMMISSION = 50;
const MIN_PERCENT_COMMISSION = 1;
const MAX_PERCENT_COMMISSION = 50;
const MAX_PRODUCTS_WITH_AFFILIATES_TO_SHOW = 10;

const validCommission = (percentCommission: number | null) =>
  percentCommission !== null &&
  percentCommission >= MIN_PERCENT_COMMISSION &&
  percentCommission <= MAX_PERCENT_COMMISSION;

type CollaboratorProduct = CollaboratorFormProduct & {
  has_error: boolean;
};

const CollaboratorForm = ({ formData }: { formData: CollaboratorFormData }) => {
  const isEditing = "id" in formData;
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const initialApplyToAllProducts = isEditing ? formData.apply_to_all_products : true;
  const initialDefaultPercentCommission = isEditing
    ? formData.percent_commission || DEFAULT_PERCENT_COMMISSION
    : DEFAULT_PERCENT_COMMISSION;
  const initialDontShowAsCoCreator = isEditing ? formData.dont_show_as_co_creator : false;

  const hasEnabledUnpublishedOrIneligibleProducts =
    isEditing &&
    formData.products.some((product) => product.enabled && (!product.published || product.has_another_collaborator));

  const [showIneligibleProducts, setShowIneligibleProducts] = React.useState(hasEnabledUnpublishedOrIneligibleProducts);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  const shouldEnableProduct = (product: CollaboratorFormProduct) => {
    if (product.has_another_collaborator) return false;
    return showIneligibleProducts || product.published;
  };

  const shouldShowProduct = (product: CollaboratorFormProduct) => {
    if (showIneligibleProducts) return true;
    return !product.has_another_collaborator && product.published;
  };

  const form = useForm<{
    email: string;
    apply_to_all_products: boolean;
    percent_commission: number | null;
    dont_show_as_co_creator: boolean;
    products: CollaboratorProduct[];
    default_commission_has_error: boolean;
  }>({
    email: isEditing ? formData.email : "",
    apply_to_all_products: initialApplyToAllProducts,
    percent_commission: initialDefaultPercentCommission,
    dont_show_as_co_creator: initialDontShowAsCoCreator,
    products: formData.products.map((product): CollaboratorProduct => {
      if (isEditing) {
        return {
          ...product,
          percent_commission: product.percent_commission || initialDefaultPercentCommission,
          dont_show_as_co_creator: initialApplyToAllProducts
            ? initialDontShowAsCoCreator
            : product.dont_show_as_co_creator,
          has_error: false,
        };
      }
      return {
        ...product,
        enabled: shouldEnableProduct(product),
        percent_commission: initialDefaultPercentCommission,
        has_error: false,
        dont_show_as_co_creator: false,
      };
    }),
    default_commission_has_error: false,
  });

  const { data, setData, processing, errors } = form;

  const productsWithAffiliates = data.products.filter((product) => product.enabled && product.has_affiliates);
  const listedProductsWithAffiliatesCount =
    productsWithAffiliates.length <= MAX_PRODUCTS_WITH_AFFILIATES_TO_SHOW + 1
      ? productsWithAffiliates.length
      : MAX_PRODUCTS_WITH_AFFILIATES_TO_SHOW;

  const handleProductChange = (id: string, attrs: Partial<CollaboratorProduct>) => {
    setData(
      "products",
      data.products.map((item) => (item.id === id ? { ...item, ...attrs, has_error: false } : item)),
    );
  };

  const handleDefaultCommissionChange = (value: number | null) => {
    setData((prevData) => ({
      ...prevData,
      percent_commission: value,
      default_commission_has_error: false,
      products: prevData.products.map((item) => ({ ...item, percent_commission: value, has_error: false })),
    }));
  };

  const submitForm = () => {
    const validatedProducts = data.products.map((product) => ({
      ...product,
      has_error: product.enabled && !data.apply_to_all_products && !validCommission(product.percent_commission),
    }));

    const defaultHasError = data.apply_to_all_products && !validCommission(data.percent_commission);

    setData((prev) => ({
      ...prev,
      products: validatedProducts,
      default_commission_has_error: defaultHasError,
    }));

    if (defaultHasError) {
      showAlert("Collaborator cut must be 50% or less", "error");
      return;
    }
    if (validatedProducts.some((p) => p.has_error)) {
      showAlert("Collaborator cut must be 50% or less", "error");
      return;
    }

    if (!isEditing) {
      let emailError = null;
      if (data.email.length === 0) {
        emailError = "Collaborator email must be provided";
      } else if (!isValidEmail(data.email)) {
        emailError = "Please enter a valid email";
      }

      if (emailError) {
        form.setError("email", emailError);
        showAlert(emailError, "error");
        emailInputRef.current?.focus();
        return;
      }
    }

    const enabledCount = validatedProducts.filter((p) => p.enabled).length;
    if (enabledCount === 0) {
      showAlert("At least one product must be selected", "error");
      return;
    }

    if (productsWithAffiliates.length > 0 && !isConfirmed) {
      setIsConfirmationModalOpen(true);
      return;
    }

    form.transform((currentData) => {
      const enabledProducts = currentData.products.flatMap(
        ({ id, enabled, percent_commission, dont_show_as_co_creator }: CollaboratorProduct) =>
          enabled ? { id, percent_commission, dont_show_as_co_creator } : [],
      );

      return {
        collaborator: {
          apply_to_all_products: currentData.apply_to_all_products,
          percent_commission: currentData.percent_commission,
          dont_show_as_co_creator: currentData.dont_show_as_co_creator,
          products: enabledProducts,
          ...(!isEditing && { email: currentData.email }),
        },
      };
    });

    const options = {
      onSuccess: () => {
        showAlert(isEditing ? "Changes saved!" : "Collaborator added!", "success");
      },
      onError: (errs: Record<string, string>) => {
        const errorMessage = errs.base || (isEditing ? "Failed to update collaborator" : "Failed to add collaborator");
        showAlert(errorMessage, "error");
      },
    };

    if (isEditing) {
      form.patch(Routes.collaborator_path(formData.id), options);
    } else {
      form.post(Routes.collaborators_path(), options);
    }
  };

  React.useEffect(() => {
    if (!isConfirmed) return;
    submitForm();
  }, [isConfirmed]);

  return (
    <Layout
      title={isEditing ? formData.name : "New collaborator"}
      headerActions={
        <>
          <NavigationButtonInertia href={Routes.collaborators_path()}>
            <Icon name="x-square" />
            Cancel
          </NavigationButtonInertia>
          <WithTooltip position="bottom" tip={formData.collaborators_disabled_reason}>
            <Button
              color="accent"
              onClick={submitForm}
              disabled={formData.collaborators_disabled_reason !== null || processing}
            >
              {processing ? "Saving..." : isEditing ? "Save changes" : "Add collaborator"}
            </Button>
          </WithTooltip>
        </>
      }
    >
      <form>
        <section className="p-8!">
          <header>
            {isEditing ? <h2>Products</h2> : null}
            <div>Collaborators will receive a cut from the revenue generated by the selected products.</div>
            <a href="/help/article/341-collaborations" target="_blank" rel="noreferrer">
              Learn more
            </a>
          </header>
          {!isEditing ? (
            <fieldset className={cx({ danger: errors.email })}>
              <legend>
                <label htmlFor="email">Email</label>
              </legend>

              <div className="input">
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={data.email}
                  placeholder="Collaborator's Gumroad account email"
                  onChange={(e) => setData("email", e.target.value.trim())}
                />
              </div>
            </fieldset>
          ) : null}
          <fieldset>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enable</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Cut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <input
                      id="all-products-cut"
                      type="checkbox"
                      role="switch"
                      checked={data.apply_to_all_products}
                      onChange={(evt) => {
                        const enabled = evt.target.checked;
                        setData((prev) => ({
                          ...prev,
                          apply_to_all_products: enabled,
                          products: prev.products.map((item) =>
                            shouldEnableProduct(item) ? { ...item, enabled } : item,
                          ),
                        }));
                      }}
                      aria-label="All products"
                    />
                  </TableCell>
                  <TableCell>
                    <label htmlFor="all-products-cut">All products</label>
                  </TableCell>
                  <TableCell>
                    <fieldset className={cx({ danger: data.default_commission_has_error })}>
                      <NumberInput value={data.percent_commission} onChange={handleDefaultCommissionChange}>
                        {(inputProps) => (
                          <div className={cx("input", { disabled: !data.apply_to_all_products })}>
                            <input
                              type="text"
                              disabled={!data.apply_to_all_products}
                              placeholder={`${data.percent_commission || DEFAULT_PERCENT_COMMISSION}`}
                              aria-label="Percentage"
                              {...inputProps}
                            />
                            <Pill className="-mr-2 shrink-0">%</Pill>
                          </div>
                        )}
                      </NumberInput>
                    </fieldset>
                  </TableCell>
                  <TableCell>
                    <label>
                      <input
                        type="checkbox"
                        checked={!data.dont_show_as_co_creator}
                        onChange={(evt) => {
                          const value = !evt.target.checked;
                          setData((prev) => ({
                            ...prev,
                            dont_show_as_co_creator: value,
                            products: prev.products.map((item) => ({
                              ...item,
                              dont_show_as_co_creator: value,
                              has_error: false,
                            })),
                          }));
                        }}
                        disabled={!data.apply_to_all_products}
                      />
                      Show as co-creator
                    </label>
                  </TableCell>
                </TableRow>
                {data.products.map((product) => {
                  const disabled = data.apply_to_all_products || !product.enabled;

                  return shouldShowProduct(product) ? (
                    <TableRow key={product.id}>
                      <TableCell>
                        <input
                          id={`enable-product-${product.id}`}
                          type="checkbox"
                          role="switch"
                          disabled={product.has_another_collaborator}
                          checked={product.enabled}
                          onChange={(evt) => handleProductChange(product.id, { enabled: evt.target.checked })}
                          aria-label="Enable all products"
                        />
                      </TableCell>
                      <TableCell>
                        <label htmlFor={`enable-product-${product.id}`}>{product.name}</label>
                        {product.has_another_collaborator || product.has_affiliates ? (
                          <small>
                            {product.has_another_collaborator
                              ? "Already has a collaborator"
                              : "Selecting this product will remove all its affiliates."}
                          </small>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <fieldset className={cx({ danger: product.has_error })}>
                          <NumberInput
                            value={product.percent_commission}
                            onChange={(value) => handleProductChange(product.id, { percent_commission: value })}
                          >
                            {(inputProps) => (
                              <div className={cx("input", { disabled })}>
                                <input
                                  disabled={disabled}
                                  type="text"
                                  placeholder={`${data.percent_commission || DEFAULT_PERCENT_COMMISSION}`}
                                  aria-label="Percentage"
                                  {...inputProps}
                                />
                                <Pill className="-mr-2 shrink-0">%</Pill>
                              </div>
                            )}
                          </NumberInput>
                        </fieldset>
                      </TableCell>
                      <TableCell>
                        <label>
                          <input
                            type="checkbox"
                            checked={!product.dont_show_as_co_creator}
                            onChange={(evt) =>
                              handleProductChange(product.id, { dont_show_as_co_creator: !evt.target.checked })
                            }
                            disabled={disabled}
                          />
                          Show as co-creator
                        </label>
                      </TableCell>
                    </TableRow>
                  ) : null;
                })}
              </TableBody>
            </Table>
          </fieldset>
          <label>
            <input
              type="checkbox"
              checked={showIneligibleProducts}
              onChange={(evt) => {
                const enabled = evt.target.checked;
                setShowIneligibleProducts(enabled);
                if (data.apply_to_all_products) {
                  setData((prev) => ({
                    ...prev,
                    products: prev.products.map((item) =>
                      !item.has_another_collaborator && enabled && !item.published ? { ...item, enabled } : item,
                    ),
                  }));
                }
              }}
            />
            Show unpublished and ineligible products
          </label>
        </section>
        <Modal
          open={isConfirmationModalOpen}
          title="Remove affiliates?"
          onClose={() => setIsConfirmationModalOpen(false)}
        >
          <h4 className="mb-3">
            Affiliates will be removed from the following products:
            <ul>
              {productsWithAffiliates.slice(0, listedProductsWithAffiliatesCount).map((product) => (
                <li key={product.id}>{product.name}</li>
              ))}
            </ul>
            {listedProductsWithAffiliatesCount < productsWithAffiliates.length ? (
              <span>{`and ${productsWithAffiliates.length - listedProductsWithAffiliatesCount} others.`}</span>
            ) : null}
          </h4>
          <div className="flex justify-between gap-3">
            <Button className="grow" onClick={() => setIsConfirmationModalOpen(false)}>
              No, cancel
            </Button>
            <Button
              color="primary"
              className="grow"
              onClick={() => {
                setIsConfirmationModalOpen(false);
                setIsConfirmed(true);
              }}
            >
              Yes, continue
            </Button>
          </div>
        </Modal>
      </form>
    </Layout>
  );
};

export default CollaboratorForm;

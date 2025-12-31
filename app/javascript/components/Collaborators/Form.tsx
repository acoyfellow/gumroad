import { Link, router, useForm, usePage } from "@inertiajs/react";
import cx from "classnames";
import * as React from "react";
import { cast } from "ts-safe-cast";

import type { CollaboratorFormProduct, EditPageProps, NewPageProps } from "$app/data/collaborators";
import { isValidEmail } from "$app/utils/email";

import { Button } from "$app/components/Button";
import { Layout } from "$app/components/Collaborators/Layout";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { NumberInput } from "$app/components/NumberInput";
import { showAlert } from "$app/components/server-components/Alert";
import { Pill } from "$app/components/ui/Pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$app/components/ui/Table";
import { WithTooltip } from "$app/components/WithTooltip";

const validCommission = (
  percentCommission: number | null,
  minPercentCommission: number,
  maxPercentCommission: number,
) =>
  percentCommission !== null && percentCommission >= minPercentCommission && percentCommission <= maxPercentCommission;

type PageProps = NewPageProps | EditPageProps;

const CollaboratorForm = () => {
  const {
    form_data: formDataFromProps,
    collaborators_disabled_reason: collaboratorsDisabledReason,
    page_metadata: {
      default_percent_commission: defaultPercentCommission,
      min_percent_commission: minPercentCommission,
      max_percent_commission: maxPercentCommission,
      max_products_with_affiliates_to_show: maxProductsWithAffiliatesToShow,
      ...pageMetadata
    },
  } = cast<PageProps>(usePage().props);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const { data: formData, setData, ...form } = useForm(formDataFromProps);
  const { percent_commission: percentCommission } = formData;
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const isEditPage = "id" in formData;

  const hasEnabledUnpublishedOrIneligibleProducts =
    isEditPage &&
    formData.products.some((product) => product.enabled && (!product.published || product.has_another_collaborator));

  const [showIneligibleProducts, setShowIneligibleProducts] = React.useState(hasEnabledUnpublishedOrIneligibleProducts);
  const {
    apply_to_all_products: applyToAllProducts,
    email: collaboratorEmail,
    dont_show_as_co_creator: dontShowAsCoCreator,
    products: formDataProducts,
  } = formData;

  const shouldEnableProduct = (product: CollaboratorFormProduct) => {
    if (product.has_another_collaborator) return false;
    return showIneligibleProducts || product.published;
  };

  const shouldShowProduct = (product: CollaboratorFormProduct) => {
    if (showIneligibleProducts) return true;
    return !product.has_another_collaborator && product.published;
  };

  const productsWithAffiliates = formDataProducts.filter((product) => product.enabled && product.has_affiliates);
  const listedProductsWithAffiliatesCount =
    productsWithAffiliates.length <= maxProductsWithAffiliatesToShow + 1
      ? productsWithAffiliates.length
      : maxProductsWithAffiliatesToShow;

  const allProductsCommissionHasError =
    applyToAllProducts && !validCommission(percentCommission, minPercentCommission, maxPercentCommission);

  const handleProductChange = (id: string, attrs: Partial<CollaboratorFormProduct>) => {
    setData(
      "products",
      formDataProducts.map((item) => (item.id === id ? { ...item, ...attrs, has_error: false } : item)),
    );
  };

  const handleSubmit = () => {
    setData(
      "products",
      formData.products.map((product) => ({
        ...product,
        has_error:
          product.enabled &&
          !applyToAllProducts &&
          !validCommission(product.percent_commission, minPercentCommission, maxPercentCommission),
      })),
    );

    if (!isEditPage) {
      const emailError =
        collaboratorEmail?.length === 0
          ? "Collaborator email must be provided"
          : !isValidEmail(collaboratorEmail ?? "")
            ? "Please enter a valid email"
            : null;
      if (emailError) {
        form.setError("email", emailError);
        showAlert(emailError, "error");
        emailInputRef.current?.focus();
        return;
      }
      form.clearErrors("email");
    }

    const enabledProducts = formData.products.filter((p) => p.enabled);

    if (enabledProducts.length === 0) {
      showAlert("At least one product must be selected", "error");
      return;
    }

    if (
      allProductsCommissionHasError ||
      enabledProducts.some(
        (product) => !validCommission(product.percent_commission, minPercentCommission, maxPercentCommission),
      )
    ) {
      showAlert(`Collaborator cut must be ${maxPercentCommission}% or less`, "error");
      return;
    }

    if (formData.products.some((product) => product.enabled && product.has_affiliates) && !isConfirmed) {
      setIsConfirmationModalOpen(true);
      return;
    }

    form.clearErrors();

    form.transform(() => ({
      collaborator: {
        apply_to_all_products: applyToAllProducts,
        percent_commission: percentCommission,
        products: enabledProducts,
        dont_show_as_co_creator: dontShowAsCoCreator,
        email: isEditPage ? undefined : collaboratorEmail,
        id: isEditPage ? formData.id : undefined,
      },
    }));

    if (isEditPage) {
      form.patch(Routes.collaborator_path(formData.id), {
        only: ["errors"],
        onError: (e) => {
          if (e.message) {
            showAlert(e.message, "error");
            router.replaceProp("errors", undefined);
          }
        },
      });
    } else {
      form.post(Routes.collaborators_path(), {
        only: ["errors"],
        onError: (e) => {
          if (e.message) {
            showAlert(e.message, "error");
            router.replaceProp("errors", undefined);
          }
        },
      });
    }
  };
  React.useEffect(() => {
    if (!isConfirmed) return;
    handleSubmit();
  }, [isConfirmed]);

  return (
    <Layout
      title={pageMetadata.title}
      headerActions={
        <>
          <Link href={Routes.collaborators_path()} className="button">
            <Icon name="x-square" />
            Cancel
          </Link>
          <WithTooltip position="bottom" tip={collaboratorsDisabledReason}>
            <Button
              color="accent"
              onClick={handleSubmit}
              disabled={collaboratorsDisabledReason !== null || form.processing}
            >
              {form.processing ? "Saving..." : isEditPage ? "Save changes" : "Add collaborator"}
            </Button>
          </WithTooltip>
        </>
      }
    >
      <form>
        <section className="p-8!">
          <header>
            {isEditPage ? <h2>Products</h2> : null}
            <div>Collaborators will receive a cut from the revenue generated by the selected products.</div>
            <a href="/help/article/341-collaborations" target="_blank" rel="noreferrer">
              Learn more
            </a>
          </header>
          {!isEditPage ? (
            <fieldset className={cx({ danger: form.errors.email })}>
              <legend>
                <label htmlFor="email">Email</label>
              </legend>

              <div className="input">
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={collaboratorEmail}
                  placeholder="Collaborator's Gumroad account email"
                  onChange={(evt) => setData("email", evt.target.value.trim())}
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
                      checked={applyToAllProducts}
                      onChange={(evt) => {
                        const enabled = evt.target.checked;
                        setData("apply_to_all_products", enabled);
                        setData(
                          "products",
                          formData.products.map((item) => (shouldEnableProduct(item) ? { ...item, enabled } : item)),
                        );
                      }}
                      aria-label="All products"
                    />
                  </TableCell>
                  <TableCell>
                    <label htmlFor="all-products-cut">All products</label>
                  </TableCell>
                  <TableCell>
                    <fieldset className={cx({ danger: allProductsCommissionHasError })}>
                      <NumberInput
                        value={percentCommission}
                        onChange={(percentCommissionValue) => {
                          setData("percent_commission", percentCommissionValue);

                          formData.products.forEach((_, index) => {
                            setData(`products.${index}.percent_commission`, percentCommissionValue);
                            setData(`products.${index}.has_error`, false);
                          });
                        }}
                      >
                        {(inputProps) => (
                          <div className={cx("input", { disabled: !applyToAllProducts })}>
                            <input
                              type="text"
                              disabled={!applyToAllProducts}
                              placeholder={`${percentCommission || defaultPercentCommission}`}
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
                        checked={!dontShowAsCoCreator}
                        onChange={(evt) => {
                          const value = !evt.target.checked;
                          setData("dont_show_as_co_creator", value);
                          setData(
                            "products",
                            formData.products.map((item) => ({
                              ...item,
                              dont_show_as_co_creator: value,
                              has_error: false,
                            })),
                          );
                        }}
                        disabled={!applyToAllProducts}
                      />
                      Show as co-creator
                    </label>
                  </TableCell>
                </TableRow>
                {formData.products.map((product) => {
                  const disabled = applyToAllProducts || !product.enabled;

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
                                  placeholder={`${percentCommission || defaultPercentCommission}`}
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
                if (applyToAllProducts) {
                  setData(
                    "products",
                    formData.products.map((item) =>
                      !item.has_another_collaborator && enabled && !item.published ? { ...item, enabled } : item,
                    ),
                  );
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

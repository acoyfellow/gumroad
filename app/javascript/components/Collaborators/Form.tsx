import { Link, router, useForm } from "@inertiajs/react";
import cx from "classnames";
import * as React from "react";

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

const CollaboratorForm = ({
  form_data: formData,
  collaborators_disabled_reason: collaboratorsDisabledReason,
  page_metadata: pageMetadata,
}: NewPageProps | EditPageProps) => {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const form = useForm(formData);
  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const isEditPage = "id" in formData;

  const hasEnabledUnpublishedOrIneligibleProducts =
    isEditPage &&
    form.data.products.some((product) => product.enabled && (!product.published || product.has_another_collaborator));

  const [showIneligibleProducts, setShowIneligibleProducts] = React.useState(hasEnabledUnpublishedOrIneligibleProducts);

  const shouldEnableProduct = (product: CollaboratorFormProduct) => {
    if (product.has_another_collaborator) return false;
    return showIneligibleProducts || product.published;
  };

  const shouldShowProduct = (product: CollaboratorFormProduct) => {
    if (showIneligibleProducts) return true;
    return !product.has_another_collaborator && product.published;
  };

  const productsWithAffiliates = form.data.products.filter((product) => product.enabled && product.has_affiliates);
  const listedProductsWithAffiliatesCount =
    productsWithAffiliates.length <= pageMetadata.max_products_with_affiliates_to_show + 1
      ? productsWithAffiliates.length
      : pageMetadata.max_products_with_affiliates_to_show;

  const allProductsCommissionHasError =
    form.data.apply_to_all_products &&
    !validCommission(
      form.data.percent_commission,
      pageMetadata.min_percent_commission,
      pageMetadata.max_percent_commission,
    );

  const handleProductChange = (id: string, attrs: Partial<CollaboratorFormProduct>) => {
    form.setData(
      "products",
      form.data.products.map((item) => (item.id === id ? { ...item, ...attrs, has_error: false } : item)),
    );
  };

  const handleSubmit = () => {
    form.setData(
      "products",
      form.data.products.map((product) => ({
        ...product,
        has_error:
          product.enabled &&
          !form.data.apply_to_all_products &&
          !validCommission(
            product.percent_commission,
            pageMetadata.min_percent_commission,
            pageMetadata.max_percent_commission,
          ),
      })),
    );

    if (!isEditPage) {
      const emailError =
        form.data.email?.length === 0
          ? "Collaborator email must be provided"
          : !isValidEmail(form.data.email ?? "")
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

    const enabledProducts = form.data.products.filter((p) => p.enabled);

    if (enabledProducts.length === 0) {
      showAlert("At least one product must be selected", "error");
      return;
    }

    if (
      allProductsCommissionHasError ||
      enabledProducts.some(
        (product) =>
          !validCommission(
            product.percent_commission,
            pageMetadata.min_percent_commission,
            pageMetadata.max_percent_commission,
          ),
      )
    ) {
      showAlert(`Collaborator cut must be ${pageMetadata.max_percent_commission}% or less`, "error");
      return;
    }

    if (form.data.products.some((product) => product.enabled && product.has_affiliates) && !isConfirmed) {
      setIsConfirmationModalOpen(true);
      return;
    }

    form.clearErrors();

    form.transform((data) => ({
      collaborator: {
        ...data,
        products: enabledProducts,
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
                  value={form.data.email}
                  placeholder="Collaborator's Gumroad account email"
                  onChange={(evt) => form.setData("email", evt.target.value.trim())}
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
                      checked={form.data.apply_to_all_products}
                      onChange={(evt) => {
                        const enabled = evt.target.checked;
                        form.setData("apply_to_all_products", enabled);
                        form.setData(
                          "products",
                          form.data.products.map((item) => (shouldEnableProduct(item) ? { ...item, enabled } : item)),
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
                        value={form.data.percent_commission}
                        onChange={(percentCommissionValue) => {
                          form.setData("percent_commission", percentCommissionValue);

                          form.data.products.forEach((_, index) => {
                            form.setData(`products.${index}.percent_commission`, percentCommissionValue);
                            form.setData(`products.${index}.has_error`, false);
                          });
                        }}
                      >
                        {(inputProps) => (
                          <div className={cx("input", { disabled: !form.data.apply_to_all_products })}>
                            <input
                              type="text"
                              disabled={!form.data.apply_to_all_products}
                              placeholder={`${form.data.percent_commission || pageMetadata.default_percent_commission}`}
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
                        checked={!form.data.dont_show_as_co_creator}
                        onChange={(evt) => {
                          const value = !evt.target.checked;
                          form.setData("dont_show_as_co_creator", value);
                          form.setData(
                            "products",
                            form.data.products.map((item) => ({
                              ...item,
                              dont_show_as_co_creator: value,
                              has_error: false,
                            })),
                          );
                        }}
                        disabled={!form.data.apply_to_all_products}
                      />
                      Show as co-creator
                    </label>
                  </TableCell>
                </TableRow>
                {form.data.products.map((product) => {
                  const disabled = form.data.apply_to_all_products || !product.enabled;

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
                                  placeholder={`${product.percent_commission || pageMetadata.default_percent_commission}`}
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
                if (form.data.apply_to_all_products) {
                  form.setData(
                    "products",
                    form.data.products.map((item) =>
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

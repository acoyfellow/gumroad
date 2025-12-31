import type { Collaborator } from "$app/data/collaborators";
import type { IncomingCollaborator } from "$app/data/incoming_collaborators";

export const formatAsPercent = (commission: number) => (commission / 100).toLocaleString([], { style: "percent" });

export const formatProductNames = (collaborator: Collaborator | IncomingCollaborator) => {
  const products = collaborator.products;
  if (products.length === 0) {
    return "None";
  } else if (products.length === 1 && products[0]) {
    return products[0].name;
  }
  const count = products.length;
  return count === 1 ? "1 product" : `${count.toLocaleString()} products`;
};

export const getProductCommission = (
  product: Collaborator["products"][number] | IncomingCollaborator["products"][number],
): number => {
  if ("percent_commission" in product) {
    return product.percent_commission;
  }
  return product.affiliate_percentage;
};

const getDefaultCommission = (collaborator: Collaborator | IncomingCollaborator): number => {
  if ("percent_commission" in collaborator) {
    return collaborator.percent_commission ?? 0;
  }
  return collaborator.affiliate_percentage ?? 0;
};

export const formatCommission = (collaborator: Collaborator | IncomingCollaborator) => {
  const products = collaborator.products;

  if (products.length > 0) {
    const sortedCommissions = products.map((product) => getProductCommission(product)).sort((a, b) => a - b);
    const commissions = [...new Set(sortedCommissions)]; // remove duplicates

    if (commissions.length === 0) {
      return formatAsPercent(getDefaultCommission(collaborator));
    } else if (commissions.length === 1 && commissions[0] !== undefined) {
      return formatAsPercent(commissions[0]);
    } else if (commissions.length > 1) {
      const lowestCommission = commissions[0];
      const highestCommission = commissions[commissions.length - 1];
      if (lowestCommission !== undefined && highestCommission !== undefined) {
        return `${formatAsPercent(lowestCommission)} - ${formatAsPercent(highestCommission)}`;
      }
    }
  }

  return formatAsPercent(getDefaultCommission(collaborator));
};

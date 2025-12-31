# frozen_string_literal: true

class CollaboratorPresenter
  def initialize(seller:, collaborator: nil)
    @seller = seller
    @collaborator = collaborator
  end

  DEFAULT_PERCENT_COMMISSION = 50
  MAX_PRODUCTS_WITH_AFFILIATES_TO_SHOW = 10

  def new_collaborator_props
    collaborator_form_props.compact
  end

  def collaborator_props
    collaborator.as_json.merge(products:)
  end

  def edit_collaborator_props
    collaborator_form_props.compact
  end

  def inertia_shared_props
    {
      collaborators_disabled_reason: seller.has_brazilian_stripe_connect_account? ? "Collaborators with Brazilian Stripe accounts are not supported." : nil,
    }
  end

  def incoming_collaborator_props(collaborator)
    {
      affiliate_percentage: collaborator.affiliate_percentage || DEFAULT_PERCENT_COMMISSION,
      apply_to_all_products: collaborator.apply_to_all_products,
      dont_show_as_co_creator: collaborator.dont_show_as_co_creator,
      id: collaborator.external_id,
      invitation_accepted: collaborator.invitation_accepted?,
      products: collaborator.product_affiliates.map do |product_affiliate|
        {
          id: product_affiliate.product.external_id,
          url: product_affiliate.product.long_url,
          name: product_affiliate.product.name,
          affiliate_percentage: product_affiliate.affiliate_percentage || collaborator.affiliate_percentage,
          dont_show_as_co_creator: product_affiliate.dont_show_as_co_creator,
        }
      end,
      seller_avatar_url: collaborator.seller.avatar_url,
      seller_email: collaborator.seller.email,
      seller_name: collaborator.seller.display_name(prefer_email_over_default_username: true),
    }
  end

  private
    attr_reader :seller, :collaborator

    def collaborator_form_props
      for_edit_page = collaborator.present?
      product_affiliates = for_edit_page ? collaborator.product_affiliates.includes(:product) : []
      default_commission = for_edit_page ? (collaborator.affiliate_percentage || DEFAULT_PERCENT_COMMISSION) : DEFAULT_PERCENT_COMMISSION
      apply_to_all = for_edit_page ? collaborator.apply_to_all_products? : true

      {
        form_data: {
          id: for_edit_page ? collaborator.external_id : nil,
          email: for_edit_page ? nil : "",
          apply_to_all_products: apply_to_all,
          percent_commission: default_commission,
          dont_show_as_co_creator: for_edit_page ? collaborator.dont_show_as_co_creator? : false,
          products: all_products(for_edit_page:, product_affiliates:, default_commission:, apply_to_all:),
        }.compact,
        page_metadata: {
          default_percent_commission: DEFAULT_PERCENT_COMMISSION,
          min_percent_commission: Collaborator::MIN_PERCENT_COMMISSION,
          max_percent_commission: Collaborator::MAX_PERCENT_COMMISSION,
          max_products_with_affiliates_to_show: MAX_PRODUCTS_WITH_AFFILIATES_TO_SHOW,
          title: for_edit_page ? collaborator.affiliate_user.display_name(prefer_email_over_default_username: true) : "New collaborator",
        }.compact,
      }
    end

    def products
      collaborator&.product_affiliates&.includes(:product)&.map do |pa|
        {
          id: pa.product.external_id,
          name: pa.product.name,
          percent_commission: pa.affiliate_percentage || collaborator.affiliate_percentage,
        }
      end
    end

    def all_products(for_edit_page:, product_affiliates:, default_commission:, apply_to_all:)
      seller.products.includes(product_affiliates: :affiliate).visible_and_not_archived.map do |product|
        product_affiliate = for_edit_page ? product_affiliates.find { _1.product.id == product.id } : nil
        {
          id: product.external_id,
          name: product.name,
          has_another_collaborator: product.has_another_collaborator?(collaborator:),
          has_affiliates: product.direct_affiliates.alive.exists?,
          published: product.published?,
          enabled: for_edit_page ? product_affiliate.present? : (!product.has_another_collaborator?(collaborator:) && product.published?),
          percent_commission: for_edit_page ? (product_affiliate&.affiliate_percentage || default_commission) : DEFAULT_PERCENT_COMMISSION,
          dont_show_as_co_creator: for_edit_page ? (apply_to_all ? collaborator.dont_show_as_co_creator? : (product_affiliate&.dont_show_as_co_creator || false)) : false,
          has_error: false,
        }
      end
    end
end

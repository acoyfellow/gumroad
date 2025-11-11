# frozen_string_literal: true

class PostsController < ApplicationController
  include CustomDomainConfig

  before_action :authenticate_user!, only: %i[send_for_purchase send_missed_posts]
  after_action :verify_authorized, only: %i[send_for_purchase send_missed_posts]
  before_action :fetch_post, only: %i[send_for_purchase]
  before_action :fetch_purchase, only: %i[send_for_purchase send_missed_posts]
  before_action :ensure_seller_is_eligible_to_send_emails, only: %i[send_for_purchase send_missed_posts]
  before_action :ensure_can_contact_for_purchase, only: %i[send_for_purchase send_missed_posts]
  before_action :set_user_and_custom_domain_config, only: %i[show]
  before_action :check_if_needs_redirect, only: %i[show]

  def show
    # Skip fetching post again if it's already fetched in check_if_needs_redirect
    @post || fetch_post(false)

    @title = "#{@post.name} - #{@post.user.name_or_username}"
    @hide_layouts = true
    @show_user_favicon = true
    @body_class = "post-page"
    @body_id = "post_page"

    @on_posts_page = true

    # Set @user instance variable to apply third-party analytics config in layouts/_head partial.
    @user = @post.seller
    seller_context = SellerContext.new(
      user: logged_in_user,
      seller: (logged_in_user && policy(@post).preview?) ? current_seller : logged_in_user
    )
    @post_presenter = PostPresenter.new(
      pundit_user: seller_context,
      post: @post,
      purchase_id_param: params[:purchase_id]
    )
    purchase = @post_presenter.purchase

    if purchase
      @subscription = purchase.subscription
    end

    e404 if @post_presenter.e404?
  end

  def redirect_from_purchase_id
    authorize Installment

    # redirects legacy installment paths like /library/purchase/:purchase_id
    # to the new path /:username/p/:slug
    fetch_post(false)
    redirect_to build_view_post_route(post: @post, purchase_id: params[:purchase_id])
  end

  def send_for_purchase
    authorize @post

    SendPostsForPurchaseService.send_post(post: @post, purchase: @purchase)

    head :no_content
  end

  def send_missed_posts
    authorize [:audience, @purchase], :send_missed_posts?

    SendPostsForPurchaseService.send_missed_posts_for(purchase: @purchase)

    render json: { message: "Missed emails are queued for delivery" }, status: :ok
  end

  def increment_post_views
    fetch_post(false)

    skip = is_bot?
    skip |= logged_in_user.present? && (@post.seller_id == current_seller.id || logged_in_user.is_team_member?)
    skip |= impersonating_user&.id

    create_post_event(@post) unless skip

    render json: { success: true }
  end

  private
    def fetch_post(viewed_by_seller = true)
      if params[:slug]
        @post = Installment.find_by_slug(params[:slug])
      elsif params[:id]
        @post = Installment.find_by_external_id(params[:id])
      else
        e404
      end
      e404 if @post.blank?

      if @post.seller_id?
        @seller = @post.seller
      else
        @seller = @post.link.seller
      end

      if viewed_by_seller
        e404 if @seller != current_seller
      end
    end

    def check_if_needs_redirect
      fetch_post(false)

      if !@is_user_custom_domain && @user.subdomain_with_protocol.present?
        redirect_to custom_domain_view_post_url(slug: @post.slug, host: @user.subdomain_with_protocol,
                                                params: request.query_parameters),
                    status: :moved_permanently, allow_other_host: true
      end
    end

    def fetch_purchase
      @purchase = current_seller.sales.find_by_external_id(params[:purchase_id])
      return e404_json if @purchase.blank?

      @seller = @purchase.seller
    end

    def ensure_seller_is_eligible_to_send_emails
      unless @seller&.eligible_to_send_emails?
        render json: { message: "You are not eligible to resend this email." }, status: :unauthorized
      end
    end

    def ensure_can_contact_for_purchase
      unless @purchase.can_contact?
        render json: { message: "This customer has opted out of receiving emails." }, status: :forbidden
      end
    end
end

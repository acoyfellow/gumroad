# frozen_string_literal: true

class UtmLinksController < Sellers::BaseController
  before_action :set_utm_link, only: %i[edit update destroy]
  before_action :authorize_utm_link, only: %i[edit update destroy]

  layout "inertia"

  def index
    authorize UtmLink

    render inertia: "UtmLinks/Index", props: {
      utm_links_props: -> {
        PaginatedUtmLinksPresenter.new(
          seller: current_seller,
          query: index_params[:query],
          page: index_params[:page],
          sort: index_params[:sort]
        ).props
      },
      query: index_params[:query],
      sort: index_params[:sort],
      utm_links_stats: InertiaRails.merge do
        if params[:ids].present?
          utm_link_ids = current_seller.utm_links.by_external_ids(params[:ids]).pluck(:id)
          UtmLinksStatsPresenter.new(seller: current_seller, utm_link_ids:).props
        else
          {}
        end
      end
    }
  end

  def new
    authorize UtmLink

    presenter = UtmLinkPresenter.new(seller: current_seller)
    render inertia: "UtmLinks/New", props: {
      utm_link: -> { new_utm_link_props(presenter) },
      context: InertiaRails.optional { presenter.utm_link_form_context_props }
    }
  end

  def create
    authorize UtmLink

    save_utm_link(
      success_message: "Link created!",
      error_redirect_path: new_dashboard_utm_link_path(copy_from: params[:copy_from])
    )
  end

  def edit
    presenter = UtmLinkPresenter.new(seller: current_seller, utm_link: @utm_link)
    render inertia: "UtmLinks/Edit", props: presenter.edit_page_react_props
  end

  def update
    return e404 if @utm_link.deleted?

    save_utm_link(
      success_message: "Link updated!",
      error_redirect_path: edit_dashboard_utm_link_path(@utm_link.external_id)
    )
  end

  def destroy
    @utm_link.mark_deleted!
    redirect_to dashboard_utm_links_path(
      index_params.except(:ids).to_h.compact
    ), notice: "Link deleted!", status: :see_other
  end

  private
    def set_title
      @title = "UTM Links"
    end

    def new_utm_link_props(presenter)
      base_props = presenter.new_page_react_props(copy_from: params[:copy_from])
      utm_link_props = base_props[:utm_link] || {}
      # Generate fresh permalink for the new link (or when regenerating via partial reload)
      new_permalink = UtmLink.generate_permalink
      new_short_url = UtmLink.new(permalink: new_permalink).short_url
      utm_link_props.merge(short_url: new_short_url, permalink: new_permalink)
    end

    def set_utm_link
      @utm_link = current_seller.utm_links.find_by_external_id(params[:id])
      e404 unless @utm_link
    end

    def authorize_utm_link
      authorize @utm_link
    end

    def index_params
      params.permit(:query, :page, :key, :direction, ids: []).tap do |p|
        p[:sort] = { key: p[:key], direction: p[:direction] } if p[:key].present? && p[:direction].present?
      end
    end

    def permitted_params
      params.require(:utm_link).permit(
        :title, :target_resource_type, :target_resource_id,
        :permalink, :utm_source, :utm_medium, :utm_campaign,
        :utm_term, :utm_content
      ).merge(
        ip_address: request.remote_ip,
        browser_guid: cookies[:_gumroad_guid]
      )
    end

    def save_utm_link(success_message:, error_redirect_path:)
      SaveUtmLinkService.new(seller: current_seller, params: permitted_params, utm_link: @utm_link).perform
      redirect_to dashboard_utm_links_path, notice: success_message, status: :see_other
    rescue ActiveRecord::RecordInvalid => e
      redirect_to error_redirect_path, inertia: { errors: e.record.errors }, alert: e.record.errors.full_messages.join(", ")
    end
end

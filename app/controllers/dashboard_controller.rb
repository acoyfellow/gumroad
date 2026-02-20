# frozen_string_literal: true

class DashboardController < Sellers::BaseController
  include ActionView::Helpers::NumberHelper, CurrencyHelper
  skip_before_action :check_suspended
  before_action :check_payment_details, only: :index

  layout "inertia", only: :index

  def index
    authorize :dashboard

    if current_seller.suspended_for_tos_violation?
      redirect_to products_url
    else
      LargeSeller.create_if_warranted(current_seller)
      presenter = CreatorHomePresenter.new(pundit_user)
      render inertia: "Dashboard/Index",
             props: { creator_home: presenter.creator_home_props }
    end
  rescue Elasticsearch::Transport::Transport::Errors::NotFound, Faraday::Error => e
    Rails.logger.warn("Dashboard ES error, rendering with empty data: #{e.message}")
    render inertia: "Dashboard/Index", props: {
      creator_home: {
        name: "", has_sale: false,
        getting_started_stats: {}, balances: { balance: "$0", last_seven_days_sales_total: "$0", last_28_days_sales_total: "$0", total: "$0" },
        sales: [], activity_items: [], stripe_verification_message: nil,
        tax_forms: {}, show_1099_download_notice: false, tax_center_enabled: false,
      }
    }
  end

  def customers_count
    authorize :dashboard

    count = current_seller.all_sales_count
    render json: { success: true, value: number_with_delimiter(count) }
  end

  def total_revenue
    authorize :dashboard

    revenue = current_seller.gross_sales_cents_total_as_seller
    render json: { success: true, value: formatted_dollar_amount(revenue) }
  end

  def active_members_count
    authorize :dashboard

    count = current_seller.active_members_count
    render json: { success: true, value: number_with_delimiter(count) }
  end

  def monthly_recurring_revenue
    authorize :dashboard

    revenue = current_seller.monthly_recurring_revenue
    render json: { success: true, value: formatted_dollar_amount(revenue) }
  end

  def download_tax_form
    authorize :dashboard

    year = Time.current.year - 1
    tax_form_download_url = current_seller.tax_form_1099_download_url(year:)
    return redirect_to tax_form_download_url, allow_other_host: true if tax_form_download_url.present?

    flash[:alert] = "A 1099 form for #{year} was not filed for your account."
    redirect_to dashboard_path
  end
end

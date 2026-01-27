# frozen_string_literal: true

class HelpCenterPresenter
  include Rails.application.routes.url_helpers

  attr_reader :view_context

  def initialize(view_context:)
    @view_context = view_context
  end

  def default_url_options
    { host: DOMAIN, protocol: PROTOCOL }
  end

  def index_props
    {
      categories: categories_with_articles
    }
  end

  def article_props(article)
    {
      article: {
        title: article.title,
        slug: article.slug,
        content: render_article_content(article),
        category: category_data(article.category)
      },
      sidebar_categories: article.category.categories_for_same_audience.map { |cat| sidebar_category_data(cat) }
    }
  end

  def category_props(category)
    {
      category: {
        title: category.title,
        slug: category.slug,
        articles: category.articles.map { |article| article_link_data(article) }
      },
      sidebar_categories: category.categories_for_same_audience.map { |cat| sidebar_category_data(cat) }
    }
  end

  private
    def categories_with_articles
      HelpCenter::Category.all.map do |category|
        {
          title: category.title,
          url: help_center_category_path(category),
          audience: category.audience,
          articles: category.articles.map { |article| article_link_data(article) }
        }
      end
    end

    def article_link_data(article)
      {
        title: article.title,
        url: help_center_article_path(article)
      }
    end

    def category_data(category)
      {
        title: category.title,
        slug: category.slug,
        url: help_center_category_path(category)
      }
    end

    def sidebar_category_data(category)
      {
        title: category.title,
        slug: category.slug,
        url: help_center_category_path(category)
      }
    end

    def render_article_content(article)
      view_context.render(article)
    end
end

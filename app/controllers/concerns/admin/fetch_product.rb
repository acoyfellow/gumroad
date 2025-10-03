module Admin::FetchProduct
  private

    def fetch_product
      @product = Link.where(id: product_param).or(Link.where(unique_permalink: product_param)).first
      @product || e404
    end

    def fetch_product_by_general_permalink
      @product = Link.find_by(id: product_param)
      return redirect_to admin_product_path(@product.unique_permalink) if @product

      product_matches = Link.by_general_permalink(product_param)

      if product_matches.many?
        @title = "Multiple products matched"
        render inertia: "Admin/Products/MultipleMatches",
                 props: inertia_props(
                   product_matches: product_matches.as_json(admin_multiple_matches: true)
                 )
        return
      else
        @product = product_matches.first || e404
      end

      if @product && @product.unique_permalink != product_param
        redirect_to admin_product_path(@product.unique_permalink)
      end
    end

    def product_param
      params[:product_id]
    end
end

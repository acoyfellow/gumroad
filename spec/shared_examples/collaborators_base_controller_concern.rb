# frozen_string_literal: true

require "spec_helper"
require "shared_examples/sellers_base_controller_concern"

RSpec.shared_examples_for "inherits from Collaborators::BaseController" do
  it_behaves_like "inherits from Sellers::BaseController"

  it "inherits from Collaborators::BaseController and uses inertia layout" do
    expect(controller.class.ancestors.include?(Collaborators::BaseController)).to eq(true)
    expect(described_class._layout).to eq("inertia")
  end
end

RSpec.shared_examples_for "collaborator disabled reason sent" do |verb, action|
  it "on #{verb}: #{action}" do
    format = defined?(request_format) ? request_format : :html
    expect_any_instance_of(CollaboratorPresenter).to receive(:inertia_shared_props).and_call_original

    public_send(verb, action, params: defined?(request_params) ? request_params : {}, as: format)

    expect(response).to be_successful
    expect(inertia.props).to have_key(:collaborators_disabled_reason)
  end
end

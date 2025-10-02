# frozen_string_literal: true

module AttributeBlockable
  extend ActiveSupport::Concern

  included do
    attribute :blocked_by_attributes, :json, default: {}
  end

  module RelationMethods
    def with_blocked_attributes_for(*method_names)
      spawn.tap { |relation| relation.extending!(BlockedAttributesPreloader.new(*method_names)) }
    end
  end

  class BlockedAttributesPreloader < Module
    def initialize(*method_names)
      @method_names = Array.wrap(method_names).map(&:to_s)
      super()
    end

    def extended(relation)
      add_method_to_preload_list(relation)
      override_exec_queries(relation)
      define_preloading_methods(relation)
      relation
    end

    private
      def add_method_to_preload_list(relation)
        existing_methods = relation.instance_variable_get(:@_blocked_attributes_methods) || Set.new
        relation.instance_variable_set(:@_blocked_attributes_methods, Set.new(existing_methods + @method_names))
      end

      def override_exec_queries(relation)
        relation.define_singleton_method(:exec_queries) do |&block|
          @records = super(&block)
          preload_blocked_attributes! unless relation.instance_variable_get(:@_blocked_attributes_preloaded)
          @records
        end
      end

      def define_preloading_methods(relation)
        relation.define_singleton_method(:preload_blocked_attributes!) do
          return if @records.blank?

          (@_blocked_attributes_methods || Set.new).each do |method_name|
            preload_blocked_attribute_for_method(method_name)
          end

          relation.instance_variable_set(:@_blocked_attributes_preloaded, true)
        end

        relation.define_singleton_method(:preload_blocked_attribute_for_method) do |method_name|
          values = @records.filter_map { |record| record.try(method_name).presence }.uniq
          return if values.empty?

          scope = BLOCKED_OBJECT_TYPES.fetch(method_name.to_sym, :all)
          blocked_objects_by_value = BlockedObject.send(scope).find_active_objects(values).index_by(&:object_value)

          @records.each do |record|
            value = record.send(method_name)
            blocked_object = blocked_objects_by_value[value]
            record.blocked_by_attributes[method_name] = blocked_object&.blocked_at
          end
        end
      end
  end

  class_methods do
    def attr_blockable(blockable_method, attribute: nil)
      attribute ||= blockable_method
      define_method("blocked_by_#{blockable_method}_at?") { blocked_at_by_method(attribute, blockable_method:).present? }
      define_method("blocked_by_#{blockable_method}?") { blocked_at_by_method(attribute, blockable_method:).present? }
      define_method("blocked_by_#{blockable_method}_at") { blocked_at_by_method(attribute, blockable_method:) }

      define_method("blocked_#{blockable_method.to_s.pluralize}_objects") do
        blocked_objects_for_values(attribute, Array.wrap(send(blockable_method)))
      end

      define_method("blocked_#{blockable_method.to_s.pluralize}") do
        send("blocked_#{blockable_method.to_s.pluralize}_objects").map(&:object_value)
      end

      define_method("block_by_#{blockable_method}!") do |by_user_id: nil, expires_in: nil|
        return if (value = send(blockable_method)).blank?
        block_by_method(attribute, value, by_user_id:, expires_in:)
      end

      define_method("unblock_by_#{blockable_method}!") do
        return if (value = send(blockable_method)).blank?
        unblock_by_method(attribute, value)
      end
    end

    def with_blocked_attributes_for(*method_names)
      all.extending(RelationMethods).with_blocked_attributes_for(*method_names)
    end
  end

  def blocked_at_by_method(method_name, blockable_method: nil)
    blockable_method ||= method_name
    method_key = blockable_method.to_s

    return blocked_by_attributes[method_key] if blocked_by_attributes.key?(method_key)

    value = send(blockable_method)
    return if value.blank?

    blocked_at = blocked_object_for_value(method_name, value)&.blocked_at
    blocked_by_attributes[method_key] = blocked_at
    blocked_at
  end

  def block_by_method(method_name, *values, by_user_id: nil, expires_in: nil)
    values.compact_blank.each do |value|
      blocked_object = BlockedObject.block!(method_name, value, by_user_id, expires_in:)
      blocked_by_attributes[method_name.to_s] = blocked_object&.blocked_at
    end
  end

  def unblock_by_method(method_name, *values, by_user_id: nil, expires_in: nil)
    scope = BLOCKED_OBJECT_TYPES.fetch(method_name.to_sym, :all)
    BlockedObject.send(scope).find_active_objects(values).each do |blocked_object|
      blocked_object.unblock!
      blocked_by_attributes.delete(method_name.to_s) if blocked_object.blocked_at.nil?
    end
  end

  def blocked_objects_for_values(method_name, values)
    scope = BLOCKED_OBJECT_TYPES.fetch(method_name.to_sym, :all)
    BlockedObject.send(scope).find_active_objects(values)
  end

  private

  def blocked_object_for_value(method_name, value)
    scope = BLOCKED_OBJECT_TYPES.fetch(method_name.to_sym, :all)
    BlockedObject.send(scope).find_active_object(value)
  end
end

FROM ruby:3.4.3-slim AS base

ENV RAILS_ENV=production
ENV RACK_ENV=production
ENV BUNDLE_PATH=/usr/local/bundle
ENV APP_DIR=/app

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
  build-essential \
  ca-certificates \
  curl \
  default-libmysqlclient-dev \
  ffmpeg \
  git \
  imagemagick \
  libcurl4-openssl-dev \
  libjemalloc-dev \
  libjemalloc2 \
  liblzma-dev \
  libssl-dev \
  libtag1-dev \
  libvips-dev \
  libxml2-dev \
  libyaml-dev \
  libxrender1 \
  pdftk \
  zlib1g-dev \
  && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y nodejs \
  && corepack enable \
  && rm -rf /var/lib/apt/lists/*

WORKDIR $APP_DIR

# Install gems
COPY Gemfile Gemfile.lock .ruby-version ./
RUN gem install bundler:$(awk '/BUNDLED WITH/{getline; print}' Gemfile.lock | tr -d " ") \
  && bundle config set without 'development test' \
  && bundle install

# Install npm packages
COPY package.json package-lock.json ./
RUN npm install

# Copy app
COPY . .

# Create required directories
RUN mkdir -p log tmp

# Generate icon names SCSS (gitignored, must be generated before asset compilation)
RUN node lib/findIcons.js

# Precompile assets — dummy env vars so Rails can boot during build
RUN SECRET_KEY_BASE=dummy \
  DATABASE_NAME=dummy \
  DATABASE_HOST=localhost \
  DATABASE_PORT=3306 \
  DATABASE_USERNAME=dummy \
  DATABASE_PASSWORD=dummy \
  REDIS_HOST=localhost:6379 \
  SIDEKIQ_REDIS_HOST=localhost:6379 \
  RPUSH_REDIS_HOST=localhost:6379 \
  RACK_ATTACK_REDIS_HOST=localhost:6379 \
  MONGO_DATABASE_URL=localhost:27017 \
  MONGO_DATABASE_NAME=dummy \
  MONGO_DATABASE_USERNAME=dummy \
  MONGO_DATABASE_PASSWORD=dummy \
  ELASTICSEARCH_HOST=http://localhost:9200 \
  MEMCACHE_SERVERS=localhost:11211 \
  REVISION=1 \
  DEVISE_SECRET_KEY=dummy \
  OBFUSCATE_IDS_CIPHER_KEY=dummy \
  OBFUSCATE_IDS_NUMERIC_CIPHER_KEY=1234 \
  STRONGBOX_GENERAL_PASSWORD=1234 \
  NODE_ENV=production \
  CUSTOM_DOMAIN=gumroad.coey.dev \
  SHAKAPACKER_ASSET_HOST=/ \
  STRIPE_PUBLISHABLE_KEY=pk_test_dummy \
  STRIPE_API_KEY=sk_test_dummy \
  bundle exec rake js:export assets:precompile

# Precompile bootsnap
RUN bundle exec bootsnap precompile --gemfile app/ lib/

ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2

EXPOSE 3000

CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]

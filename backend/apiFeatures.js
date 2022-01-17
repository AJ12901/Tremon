class APIFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;

    // defines both these variables as class variables in our class
    // queryStr is the query params we get from the URL and query is our mongo query
  }

  filter() {
    const queryParamsObj = { ...this.queryStr };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryParamsObj[el]);

    let queryString = JSON.stringify(queryParamsObj);

    queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, (match) => {
      return `$${match}`;
    });

    this.query = this.query.find(JSON.parse(queryString));
    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      const sortParams = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortParams);
    } else {
      this.query = this.query.sort('-createdAt name');
    }
    return this;
  }

  limitFields() {
    if (this.queryStr.fields) {
      const fieldsParams = this.queryStr.fields.split(',').join(' ');
      this.query = this.query.select(fieldsParams);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  paginate() {
    const page = Number(this.queryStr.page) || 1;
    const limit = Number(this.queryStr.limit) || 100;
    const skipDocs = (page - 1) * limit;

    this.query = this.query.skip(skipDocs).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;

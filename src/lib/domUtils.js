function getTableNextCellText($, table, text){
  const th = table.find('th').filter((i, h) => {
    return $(h).text() == text;
  });

  return th.next().text().trim();
}

function getTableRow($, table, text){
  const tr = table.find('tr').filter((i, row) => {
    return $(row).text().indexOf(text) >= 0;
  });

  return tr;
}

module.exports = {
  getTableNextCellText,
  getTableRow,
};

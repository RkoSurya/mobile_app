import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ToastAndroid,
  Platform,
  Alert,
  Linking 
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import XLSX from 'xlsx';
import RNFetchBlob from 'rn-fetch-blob';

type ShopOrderDetailsParams = {
  shopName: string;
  area: string;
  orders: Array<{
    product_name: string;
    quantity: number;
    uom: string;
    amount: number;
    discountPercentage: number;
    gstPercentage: number;
  }>;
  totalAmount: number;
  subtotal: number;
  gstAmount: number;
  gstPercentage: number;
  discountAmount: number;
  discountPercentage: number;
};

type RootStackParamList = {
  ShopOrderDetails: ShopOrderDetailsParams;
};

type ShopOrderDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ShopOrderDetails'>;

interface Props {
  route: ShopOrderDetailsScreenRouteProp;
}

const ShopOrderDetailsScreen: React.FC<Props> = ({ route }) => {
  const [isExporting, setIsExporting] = useState(false);

  const { 
    shopName, 
    area, 
    orders, 
    totalAmount, 
    subtotal,
    gstAmount,
    gstPercentage,
    discountAmount,
    discountPercentage
  } = route.params;

  const showMessage = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  const exportToExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      // Create simple product rows with shop details
      const rows = route.params.orders.map(order => ({
        'Shop Name': shopName,
        'Area': area,
        'Product Name': order.product_name,
        'Quantity': order.quantity,
        'UOM': order.uom,
        'Amount': Math.round(order.amount),
        'Discount %': order.discountPercentage.toFixed(2),
        'GST %': order.gstPercentage.toFixed(2),
        'Final Amount': Math.round(order.amount * (1 - order.discountPercentage/100) * (1 + order.gstPercentage/100))
      }));

      // Add empty row
      rows.push({
        'Shop Name': '',
        'Area': '',
        'Product Name': '',
        'Quantity': '',
        'UOM': '',
        'Amount': '',
        'Discount %': '',
        'GST %': '',
        'Final Amount': ''
      });

      // Add total row
      const total = rows.reduce((sum, row) => {
        if (row['Final Amount'] !== '') {
          return sum + (row['Final Amount'] as number);
        }
        return sum;
      }, 0);

      rows.push({
        'Shop Name': 'TOTAL',
        'Area': '',
        'Product Name': '',
        'Quantity': '',
        'UOM': '',
        'Amount': '',
        'Discount %': '',
        'GST %': '',
        'Final Amount': Math.round(total)
      });

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(rows);
      
      // Set column widths
      const colWidths = [
        { wch: 20 }, // Shop Name
        { wch: 15 }, // Area
        { wch: 25 }, // Product Name
        { wch: 10 }, // Quantity
        { wch: 10 }, // UOM
        { wch: 15 }, // Amount
        { wch: 12 }, // Discount %
        { wch: 12 }, // GST %
        { wch: 15 }, // Final Amount
      ];
      
      ws['!cols'] = colWidths;

      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:I1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } }
        };
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Order Details');

      // Generate Excel file
      const today = new Date().toISOString().split('T')[0];
      const fileName = `${shopName}_${today}.xlsx`;
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      // Get download directory
      const downloadDir = RNFetchBlob.fs.dirs.DownloadDir;
      const filePath = `${downloadDir}/${fileName}`;

      // Write file
      await RNFetchBlob.fs.writeFile(filePath, wbout, 'base64');
      showMessage(`Excel file saved to Downloads folder: ${fileName}`);

      // Open file
      try {
        await Linking.openURL(`file://${filePath}`);
      } catch (error) {
        console.log('Could not open file automatically');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showMessage('Failed to export Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.shopName}>{shopName}</Text>
        <Text style={styles.area}>{area}</Text>
        <Text style={styles.subtitle}>Order Details</Text>
        <TouchableOpacity 
          style={[
            styles.exportButton,
            isExporting && styles.exportButtonDisabled
          ]}
          onPress={exportToExcel}
          disabled={isExporting}
        >
          <Text style={styles.exportButtonText}>
            {isExporting ? 'Downloading...' : 'Download as Excel'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.orderItems}>
        {orders.map((item, index) => {
          const itemSubtotal = Number(item.amount) || 0;
          const itemDiscountPercentage = Number(item.discountPercentage) || 0;
          const itemGstPercentage = Number(item.gstPercentage) || 0;
          
          const itemDiscount = (itemSubtotal * itemDiscountPercentage) / 100;
          const afterDiscount = itemSubtotal - itemDiscount;
          const itemGst = (afterDiscount * itemGstPercentage) / 100;
          const itemFinalAmount = afterDiscount + itemGst;

          return (
            <View key={index} style={styles.itemContainer}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} {item.uom} × ₹{Math.round(itemSubtotal)}
                </Text>
              </View>
              <View style={styles.itemBreakdown}>
                <Text style={styles.breakdownText}>
                  Discount ({itemDiscountPercentage}%): -₹{Math.round(itemDiscount)}
                </Text>
                <Text style={styles.breakdownText}>
                  GST ({itemGstPercentage}%): +₹{Math.round(itemGst)}
                </Text>
                <Text style={styles.finalAmount}>
                  Final Amount: ₹{Math.round(itemFinalAmount)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>
            ₹{Math.round(orders.reduce((sum, item) => sum + (Number(item.amount) || 0), 0))}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Discount</Text>
          <Text style={[styles.summaryValue, styles.discountText]}>
            -₹{Math.round(orders.reduce((sum, item) => {
              const itemSubtotal = Number(item.amount) || 0;
              const itemDiscountPercentage = Number(item.discountPercentage) || 0;
              return sum + (itemSubtotal * itemDiscountPercentage / 100);
            }, 0))}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total GST</Text>
          <Text style={[styles.summaryValue, styles.gstText]}>
            +₹{Math.round(orders.reduce((sum, item) => {
              const itemSubtotal = Number(item.amount) || 0;
              const itemDiscountPercentage = Number(item.discountPercentage) || 0;
              const afterDiscount = itemSubtotal - (itemSubtotal * itemDiscountPercentage / 100);
              const itemGstPercentage = Number(item.gstPercentage) || 0;
              return sum + (afterDiscount * itemGstPercentage / 100);
            }, 0))}
          </Text>
        </View>

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>
            ₹{Math.round(orders.reduce((sum, item) => {
              const itemSubtotal = Number(item.amount) || 0;
              const itemDiscountPercentage = Number(item.discountPercentage) || 0;
              const itemGstPercentage = Number(item.gstPercentage) || 0;
              
              const itemDiscount = (itemSubtotal * itemDiscountPercentage) / 100;
              const afterDiscount = itemSubtotal - itemDiscount;
              const itemGst = (afterDiscount * itemGstPercentage) / 100;
              const itemFinalAmount = afterDiscount + itemGst;
              
              return sum + itemFinalAmount;
            }, 0))}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  shopName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  area: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  exportButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orderItems: {
    padding: 16,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemBreakdown: {
    marginLeft: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  breakdownText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  finalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  discountText: {
    color: '#FF3B30',
  },
  gstText: {
    color: '#007AFF',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
});

export default ShopOrderDetailsScreen;
